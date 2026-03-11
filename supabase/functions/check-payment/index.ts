import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

// ─── Telegram initData verification ───────────
function verifyAndExtractUser(initData: string, botToken: string): { id: number } | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (hmac !== hash) return null;

  // 10 min TTL for polling
  const authDate = params.get("auth_date");
  if (authDate) {
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(authDate) > 600) return null;
  }

  const userStr = params.get("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, initData } = await req.json();

    // ─── Auth ────────────────────────────────────
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!initData) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tgUser = verifyAndExtractUser(initData, botToken);
    if (!tgUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Get order & verify ownership ────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("telegram_id", tgUser.id) // ownership check
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already paid
    if (order.payment_status === "paid") {
      return new Response(
        JSON.stringify({ status: order.status, paymentStatus: "paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No invoice — nothing to check
    if (!order.invoice_id) {
      return new Response(
        JSON.stringify({ status: order.status, paymentStatus: order.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Poll CryptoBot for invoice status
    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${CRYPTOBOT_API_URL}/getInvoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Crypto-Pay-API-Token": cryptobotToken,
      },
      body: JSON.stringify({ invoice_ids: order.invoice_id }),
    });

    const data = await response.json();

    if (!data.ok || !data.result?.items?.length) {
      return new Response(
        JSON.stringify({ status: order.status, paymentStatus: order.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoice = data.result.items[0];

    // Invoice paid but webhook missed — process via idempotent path
    if (invoice.status === "paid" && order.payment_status !== "paid") {
      // Try dedup insert
      const invoiceId = String(invoice.invoice_id);
      const { error: dedupError } = await supabase
        .from("processed_invoices")
        .insert({
          invoice_id: invoiceId,
          type: "payment",
          order_id: orderId,
          telegram_id: tgUser.id,
          amount: Number(invoice.amount) || 0,
        });

      if (dedupError) {
        // Already processed by webhook
        return new Response(
          JSON.stringify({ status: "paid", paymentStatus: "paid" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atomic order update
      const { data: updatedRows } = await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .neq("payment_status", "paid")
        .select("id");

      if (!updatedRows || updatedRows.length === 0) {
        return new Response(
          JSON.stringify({ status: "paid", paymentStatus: "paid" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atomic promo increment
      if (order.promo_code) {
        await supabase.rpc("increment_promo_usage", { p_code: order.promo_code });
      }

      // Atomic balance deduction
      const balanceUsed = Number(order.balance_used || 0);
      if (balanceUsed > 0) {
        const { data: newBalance, error: balErr } = await supabase.rpc("deduct_balance", {
          p_telegram_id: order.telegram_id,
          p_amount: balanceUsed,
        });

        if (!balErr) {
          await supabase.from("balance_history").insert({
            telegram_id: order.telegram_id,
            amount: -balanceUsed,
            balance_after: newBalance,
            type: "purchase",
            comment: `Заказ ${order.order_number}`,
            admin_telegram_id: order.telegram_id,
          });
        }
      }

      // Atomic inventory reservation
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity, product_title")
        .eq("order_id", orderId);

      const deliveredContent: string[] = [];
      let allDelivered = true;

      if (orderItems) {
        for (const item of orderItems) {
          const { data: reserved } = await supabase.rpc("reserve_inventory", {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
            p_order_id: orderId,
          });

          if (reserved && reserved.length > 0) {
            deliveredContent.push(
              `📦 <b>${item.product_title}</b> (×${reserved.length}):\n` +
              reserved.map((i: any) => `<code>${i.content}</code>`).join("\n")
            );

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
          .eq("id", orderId);
      }

      // TG notification
      const tgBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (tgBotToken) {
        let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${order.order_number}</code>\n💰 Сумма: ${invoice.amount} ${invoice.fiat || 'USD'}\n`;
        if (balanceUsed > 0) message += `💳 С баланса: $${balanceUsed.toFixed(2)}\n`;
        if (deliveredContent.length > 0) {
          message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные!`;
        } else {
          message += `\nВаш товар будет доставлен в ближайшее время.`;
        }
        message += `\n\nСпасибо за покупку!`;

        await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: order.telegram_id, text: message, parse_mode: "HTML" }),
        });
      }

      return new Response(
        JSON.stringify({ status: finalStatus, paymentStatus: "paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invoice expired
    if (invoice.status === "expired") {
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ status: "cancelled", paymentStatus: "expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: order.status, paymentStatus: order.payment_status, invoiceStatus: invoice.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check payment error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
