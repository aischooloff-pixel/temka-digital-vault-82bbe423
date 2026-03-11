import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already paid — return immediately
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
      body: JSON.stringify({
        invoice_ids: order.invoice_id,
      }),
    });

    const data = await response.json();

    if (!data.ok || !data.result?.items?.length) {
      return new Response(
        JSON.stringify({ status: order.status, paymentStatus: order.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoice = data.result.items[0];
    console.log("CryptoBot invoice status:", invoice.status, "for order:", orderId);

    // Invoice is paid but webhook missed — process payment now
    if (invoice.status === "paid" && order.payment_status !== "paid") {
      console.log("Invoice paid but order not updated — processing now");

      // Update order — only if not already paid (idempotency guard)
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
        console.log("Order already processed (race condition prevented):", orderId);
        return new Response(
          JSON.stringify({ status: "paid", paymentStatus: "paid" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Increment promo used_count on successful payment
      if (order.promo_code) {
        const { data: promo } = await supabase
          .from("promocodes")
          .select("id, used_count")
          .eq("code", order.promo_code)
          .maybeSingle();
        if (promo) {
          await supabase
            .from("promocodes")
            .update({ used_count: (promo.used_count || 0) + 1 })
            .eq("id", promo.id);
        }
      }

      // Deduct balance if needed
      const balanceUsed = Number(order.balance_used || 0);
      if (balanceUsed > 0) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("balance")
          .eq("telegram_id", order.telegram_id)
          .single();

        if (profile) {
          const newBalance = Math.max(0, Number(profile.balance) - balanceUsed);
          await supabase
            .from("user_profiles")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("telegram_id", order.telegram_id);

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

      // Auto-deliver
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity, product_title")
        .eq("order_id", orderId);

      const deliveredContent: string[] = [];
      let allDelivered = true;

      if (orderItems) {
        for (const item of orderItems) {
          const { data: invItems } = await supabase
            .from("inventory_items")
            .select("id, content")
            .eq("product_id", item.product_id)
            .eq("status", "available")
            .limit(item.quantity);

          if (invItems && invItems.length > 0) {
            const deliveredCount = Math.min(invItems.length, item.quantity);
            const ids = invItems.slice(0, deliveredCount).map((i: any) => i.id);

            await supabase
              .from("inventory_items")
              .update({ status: "sold", order_id: orderId, sold_at: new Date().toISOString() })
              .in("id", ids);

            deliveredContent.push(
              `📦 <b>${item.product_title}</b> (×${deliveredCount}):\n` +
              invItems.slice(0, deliveredCount).map((i: any) => `<code>${i.content}</code>`).join("\n")
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

            if (deliveredCount < item.quantity) allDelivered = false;
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
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (botToken) {
        let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${order.order_number}</code>\n💰 Сумма: ${invoice.amount} ${invoice.fiat || 'USD'}\n`;
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
    console.error("Check payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
