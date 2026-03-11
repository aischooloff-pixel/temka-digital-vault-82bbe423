import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, crypto-pay-api-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.text();
    const signature = req.headers.get("crypto-pay-api-signature");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Detect shop context from payload (before verification)
    let shopId: string | null = null;
    const parsedBody = JSON.parse(body);
    if (parsedBody.update_type === "invoice_paid" && parsedBody.payload?.payload) {
      try { shopId = JSON.parse(parsedBody.payload.payload).shopId || null; } catch {}
    }

    // Verify signature - try platform token first, then shop token
    let verified = false;
    const platformToken = Deno.env.get("CRYPTOBOT_API_TOKEN");

    if (platformToken) {
      const secret = createHash("sha256").update(platformToken).digest();
      if (createHmac("sha256", secret).update(body).digest("hex") === signature) {
        verified = true;
      }
    }

    if (!verified && shopId) {
      const ek = Deno.env.get("TOKEN_ENCRYPTION_KEY");
      if (ek) {
        const { data: shop } = await supabase.from("shops").select("cryptobot_token_encrypted").eq("id", shopId).maybeSingle();
        if (shop?.cryptobot_token_encrypted) {
          const { data: shopToken } = await supabase.rpc("decrypt_token", { p_encrypted: shop.cryptobot_token_encrypted, p_key: ek });
          if (shopToken) {
            const secret = createHash("sha256").update(shopToken).digest();
            if (createHmac("sha256", secret).update(body).digest("hex") === signature) verified = true;
          }
        }
      }
    }

    if (!verified) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (parsedBody.update_type === "invoice_paid") {
      const invoice = parsedBody.payload;
      const invoiceId = String(invoice.invoice_id);
      const orderData = JSON.parse(invoice.payload || "{}");

      // Idempotency
      const { error: dedupError } = await supabase.from("processed_invoices").insert({
        invoice_id: invoiceId,
        type: orderData.type === "topup" ? "topup" : "payment",
        order_id: orderData.orderId || null,
        telegram_id: orderData.telegramUserId || null,
        amount: Number(invoice.amount) || 0,
      });
      if (dedupError) {
        console.log("Invoice already processed:", invoiceId);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (orderData.type === "topup") {
        await handleTopup(supabase, orderData, invoiceId);
      } else if (shopId && orderData.orderId) {
        await handleShopOrderPayment(supabase, invoice, orderData, shopId);
      } else if (orderData.orderId) {
        await handleOrderPayment(supabase, invoice, orderData);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── Topup handler (platform-level) ─────────────
async function handleTopup(supabase: any, orderData: any, _invoiceId: string) {
  const topupAmount = Number(orderData.amount);
  const telegramUserId = orderData.telegramUserId;
  if (!telegramUserId || !topupAmount || topupAmount <= 0) return;

  const { data: newBalance, error } = await supabase.rpc("credit_balance", { p_telegram_id: telegramUserId, p_amount: topupAmount });
  if (error) { console.error("Balance credit error:", error.message); return; }

  await supabase.from("balance_history").insert({
    telegram_id: telegramUserId, amount: topupAmount, balance_after: newBalance,
    type: "credit", comment: "Пополнение через CryptoBot", admin_telegram_id: telegramUserId,
  });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (botToken) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramUserId, parse_mode: "HTML",
        text: `✅ <b>Баланс пополнен!</b>\n\n💰 Сумма: $${topupAmount.toFixed(2)}\n💳 Новый баланс: $${Number(newBalance).toFixed(2)}`,
      }),
    });
  }
}

// ─── Platform order payment ─────────────────────
async function handleOrderPayment(supabase: any, invoice: any, orderData: any) {
  const { data: order } = await supabase.from("orders")
    .select("id, status, payment_status, promo_code, balance_used, telegram_id, order_number")
    .eq("id", orderData.orderId).single();
  if (!order || order.payment_status === "paid") return;

  const { data: updatedRows } = await supabase.from("orders")
    .update({ status: "paid", payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", orderData.orderId).neq("payment_status", "paid").select("id");
  if (!updatedRows?.length) return;

  if (order.promo_code) await supabase.rpc("increment_promo_usage", { p_code: order.promo_code });

  const balanceUsed = Number(order.balance_used || 0);
  if (balanceUsed > 0) {
    const { data: nb, error: be } = await supabase.rpc("deduct_balance", { p_telegram_id: order.telegram_id, p_amount: balanceUsed });
    if (!be) await supabase.from("balance_history").insert({
      telegram_id: order.telegram_id, amount: -balanceUsed, balance_after: nb,
      type: "purchase", comment: `Заказ ${order.order_number}`, admin_telegram_id: order.telegram_id,
    });
  }

  await deliverInventory(supabase, orderData.orderId, "order_items", "product_title", "reserve_inventory", "inventory_items", "products", order.telegram_id, order.order_number, balanceUsed, invoice, Deno.env.get("TELEGRAM_BOT_TOKEN"), "orders");
}

// ─── Shop order payment ─────────────────────────
async function handleShopOrderPayment(supabase: any, invoice: any, orderData: any, shopId: string) {
  const { data: order } = await supabase.from("shop_orders")
    .select("id, status, payment_status, balance_used, buyer_telegram_id, order_number, shop_id")
    .eq("id", orderData.orderId).single();
  if (!order || order.payment_status === "paid") return;

  const { data: updatedRows } = await supabase.from("shop_orders")
    .update({ status: "paid", payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", orderData.orderId).neq("payment_status", "paid").select("id");
  if (!updatedRows?.length) return;

  const balanceUsed = Number(order.balance_used || 0);
  if (balanceUsed > 0) {
    const { data: nb, error: be } = await supabase.rpc("deduct_balance", { p_telegram_id: order.buyer_telegram_id, p_amount: balanceUsed });
    if (!be) await supabase.from("balance_history").insert({
      telegram_id: order.buyer_telegram_id, amount: -balanceUsed, balance_after: nb,
      type: "purchase", comment: `Заказ ${order.order_number}`, admin_telegram_id: order.buyer_telegram_id,
    });
  }

  // Resolve shop bot token for notification
  let botToken: string | null = null;
  const ek = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (ek) {
    const { data: shop } = await supabase.from("shops").select("bot_token_encrypted").eq("id", shopId).maybeSingle();
    if (shop?.bot_token_encrypted) {
      const { data } = await supabase.rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: ek });
      botToken = data;
    }
  }

  await deliverInventory(supabase, orderData.orderId, "shop_order_items", "product_name", "reserve_shop_inventory", "shop_inventory", "shop_products", order.buyer_telegram_id, order.order_number, balanceUsed, invoice, botToken, "shop_orders");
}

// ─── Shared delivery logic ──────────────────────
async function deliverInventory(
  supabase: any, orderId: string,
  itemsTable: string, titleCol: string, reserveRpc: string,
  inventoryTable: string, productsTable: string,
  telegramId: number, orderNumber: string, balanceUsed: number,
  invoice: any, botToken: string | null, orderTable: string,
) {
  const { data: orderItems } = await supabase.from(itemsTable).select(`product_id, quantity, ${titleCol}`).eq("order_id", orderId);
  const deliveredContent: string[] = [];
  let allDelivered = true;

  if (orderItems) {
    for (const item of orderItems) {
      const itemTitle = (item as any)[titleCol];
      const { data: reserved } = await supabase.rpc(reserveRpc, {
        p_product_id: item.product_id, p_quantity: item.quantity, p_order_id: orderId,
      });
      if (reserved?.length) {
        deliveredContent.push(`📦 <b>${itemTitle}</b> (×${reserved.length}):\n${reserved.map((i: any) => `<code>${i.content}</code>`).join("\n")}`);
        const { count: remaining } = await supabase.from(inventoryTable).select("id", { count: "exact", head: true })
          .eq("product_id", item.product_id).eq("status", "available");
        await supabase.from(productsTable).update({ stock: remaining || 0, updated_at: new Date().toISOString() }).eq("id", item.product_id);
        if (reserved.length < item.quantity) allDelivered = false;
      } else { allDelivered = false; }
    }
  }

  const finalStatus = allDelivered && deliveredContent.length > 0 ? "delivered" : "paid";
  if (finalStatus !== "paid") {
    await supabase.from(orderTable).update({ status: finalStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
  }

  if (botToken) {
    let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${orderNumber}</code>\n💰 Сумма: ${invoice.amount} USD\n`;
    if (balanceUsed > 0) message += `💳 С баланса: $${balanceUsed.toFixed(2)}\n`;
    if (deliveredContent.length > 0) {
      message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные!`;
    } else { message += `\nВаш товар будет доставлен в ближайшее время.`; }
    message += `\n\nСпасибо за покупку!`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text: message, parse_mode: "HTML" }),
    });
  }
}
