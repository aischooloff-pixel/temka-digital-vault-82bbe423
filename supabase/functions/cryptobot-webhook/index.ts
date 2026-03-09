import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "node:crypto";
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

    // Verify webhook signature
    const secret = createHmac("sha256", "WebAppData").update(cryptobotToken).digest();
    const expectedSignature = createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(body);
    console.log("CryptoBot webhook received:", data);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (data.update_type === "invoice_paid") {
      const invoice = data.payload;
      const orderData = JSON.parse(invoice.payload || "{}");

      console.log("Payment confirmed:", {
        invoiceId: invoice.invoice_id,
        amount: invoice.amount,
        orderId: orderData.orderId,
        telegramUserId: orderData.telegramUserId,
      });

      // Update order status
      if (orderData.orderId) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderData.orderId);

        if (updateError) {
          console.error("Failed to update order:", updateError);
        } else {
          console.log("Order updated to paid:", orderData.orderId);
        }

        // Auto-deliver inventory items
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, quantity, product_title")
          .eq("order_id", orderData.orderId);

        const deliveredContent: string[] = [];
        let allDelivered = true;

        if (orderItems) {
          for (const item of orderItems) {
            // Get available inventory items for this product
            const { data: invItems } = await supabase
              .from("inventory_items")
              .select("id, content")
              .eq("product_id", item.product_id)
              .eq("status", "available")
              .limit(item.quantity);

            if (invItems && invItems.length > 0) {
              const deliveredCount = Math.min(invItems.length, item.quantity);
              const ids = invItems.slice(0, deliveredCount).map(i => i.id);

              // Mark as sold
              await supabase
                .from("inventory_items")
                .update({
                  status: "sold",
                  order_id: orderData.orderId,
                  sold_at: new Date().toISOString(),
                })
                .in("id", ids);

              // Collect content for delivery
              deliveredContent.push(
                `📦 <b>${item.product_title}</b> (×${deliveredCount}):\n` +
                invItems.slice(0, deliveredCount).map(i => `<code>${i.content}</code>`).join("\n")
              );

              // Update stock
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

        // Update order status based on delivery
        const finalStatus = allDelivered && deliveredContent.length > 0 ? "delivered" : "paid";
        if (finalStatus !== "paid") {
          await supabase
            .from("orders")
            .update({ status: finalStatus, updated_at: new Date().toISOString() })
            .eq("id", orderData.orderId);
        }

        // Send confirmation + delivered content via Telegram Bot
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken && orderData.telegramUserId) {
          let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${orderData.orderNumber || orderData.orderId}</code>\n💰 Сумма: ${invoice.amount} ${invoice.fiat || 'USD'}\n`;

          if (deliveredContent.length > 0) {
            message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные! Сообщение может быть удалено.`;
          } else {
            message += `\nВаш товар будет доставлен в ближайшее время.`;
          }

          message += `\n\nСпасибо за покупку!`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: orderData.telegramUserId,
              text: message,
              parse_mode: "HTML",
            }),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
