import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, crypto-pay-api-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("crypto-pay-api-signature");

    const secret = createHash("sha256").update(cryptobotToken).digest();
    const expectedSignature = createHmac("sha256", secret).update(body).digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (data.update_type === "invoice_paid") {
      const invoice = data.payload;
      const invoiceId = String(invoice.invoice_id);
      const orderData = JSON.parse(invoice.payload || "{}");

      // ─── Idempotency check via processed_invoices ───
      const { error: dedupError } = await supabase
        .from("processed_invoices")
        .insert({
          invoice_id: invoiceId,
          type: orderData.type === "topup" ? "topup" : "payment",
          order_id: orderData.orderId || null,
          telegram_id: orderData.telegramUserId || null,
          amount: Number(invoice.amount) || 0,
        });

      if (dedupError) {
        // Unique constraint violation = already processed
        console.log("Invoice already processed (dedup):", invoiceId);
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (orderData.type === "topup") {
        await handleTopup(supabase, orderData, invoiceId);
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (orderData.orderId) {
        await handleOrderPayment(supabase, invoice, orderData);
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleTopup(supabase: any, orderData: any, _invoiceId: string) {
  const topupAmount = Number(orderData.amount);
  const telegramUserId = orderData.telegramUserId;

  if (!telegramUserId || !topupAmount || topupAmount <= 0) return;

  // Atomic balance credit
  const { data: newBalance, error } = await supabase.rpc("credit_balance", {
    p_telegram_id: telegramUserId,
    p_amount: topupAmount,
  });

  if (error) {
    console.error("Balance credit error:", error.message);
    return;
  }

  await supabase.from("balance_history").insert({
    telegram_id: telegramUserId,
    amount: topupAmount,
    balance_after: newBalance,
    type: "credit",
    comment: `Пополнение через CryptoBot`,
    admin_telegram_id: telegramUserId,
  });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (botToken) {
    const message = `✅ <b>Баланс пополнен!</b>\n\n💰 Сумма: $${topupAmount.toFixed(2)}\n💳 Новый баланс: $${Number(newBalance).toFixed(2)}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramUserId, text: message, parse_mode: "HTML" }),
    });
  }
}

async function handleOrderPayment(supabase: any, invoice: any, orderData: any) {
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, status, payment_status, promo_code, balance_used, telegram_id, order_number")
    .eq("id", orderData.orderId)
    .single();

  if (!existingOrder || existingOrder.payment_status === "paid") return;

  // Atomic status update with idempotency guard
  const { data: updatedRows } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderData.orderId)
    .neq("payment_status", "paid")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) return;

  // Atomic promo increment
  if (existingOrder.promo_code) {
    await supabase.rpc("increment_promo_usage", { p_code: existingOrder.promo_code });
  }

  // Atomic balance deduction
  const balanceUsed = Number(existingOrder.balance_used || 0);
  let newBalance: number | null = null;
  if (balanceUsed > 0) {
    const { data, error } = await supabase.rpc("deduct_balance", {
      p_telegram_id: existingOrder.telegram_id,
      p_amount: balanceUsed,
    });
    if (!error) {
      newBalance = data;
      await supabase.from("balance_history").insert({
        telegram_id: existingOrder.telegram_id,
        amount: -balanceUsed,
        balance_after: newBalance,
        type: "purchase",
        comment: `Заказ ${existingOrder.order_number}`,
        admin_telegram_id: existingOrder.telegram_id,
      });
    }
  }

  // Atomic inventory reservation via DB function
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity, product_title")
    .eq("order_id", orderData.orderId);

  const deliveredContent: string[] = [];
  let allDelivered = true;

  if (orderItems) {
    for (const item of orderItems) {
      const { data: reserved } = await supabase.rpc("reserve_inventory", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_order_id: orderData.orderId,
      });

      if (reserved && reserved.length > 0) {
        deliveredContent.push(
          `📦 <b>${item.product_title}</b> (×${reserved.length}):\n` +
          reserved.map((i: any) => `<code>${i.content}</code>`).join("\n")
        );

        // Update stock count
        const { count: remaining } = await supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("product_id", item.product_id)
          .eq("status", "available");

        await supabase
          .from("products")
          .update({ stock: remaining || 0, updated_at: new Date().toISOString() })
          .eq("id", item.product_id);

        if (reserved.length < item.quantity) allDelivered = false;
      } else {
        allDelivered = false;
      }
    }
  }

  const finalStatus = allDelivered && deliveredContent.length > 0 ? "delivered" : "paid";
  if (finalStatus !== "paid") {
    await supabase
      .from("orders")
      .update({ status: finalStatus, updated_at: new Date().toISOString() })
      .eq("id", orderData.orderId);
  }

  // TG notification
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (botToken && existingOrder.telegram_id) {
    let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${existingOrder.order_number}</code>\n💰 Сумма: ${invoice.amount} ${invoice.fiat || 'USD'}\n`;
    if (balanceUsed > 0) message += `💳 С баланса: $${balanceUsed.toFixed(2)}\n`;
    if (deliveredContent.length > 0) {
      message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные!`;
    } else {
      message += `\nВаш товар будет доставлен в ближайшее время.`;
    }
    message += `\n\nСпасибо за покупку!`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: existingOrder.telegram_id, text: message, parse_mode: "HTML" }),
    });
  }
}
