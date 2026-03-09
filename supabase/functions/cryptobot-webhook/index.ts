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

        // Decrement stock for order items
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", orderData.orderId);

        if (orderItems) {
          for (const item of orderItems) {
            await supabase.rpc('', {}).catch(() => {});
            // Decrement stock manually
            const { data: product } = await supabase
              .from("products")
              .select("stock")
              .eq("id", item.product_id)
              .single();

            if (product) {
              await supabase
                .from("products")
                .update({ stock: Math.max(0, product.stock - item.quantity), updated_at: new Date().toISOString() })
                .eq("id", item.product_id);
            }
          }
        }

        // Send confirmation via Telegram Bot
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken && orderData.telegramUserId) {
          const message = `✅ *Оплата подтверждена!*\n\n📦 Заказ: \`${orderData.orderNumber || orderData.orderId}\`\n💰 Сумма: ${invoice.amount} ${invoice.fiat || 'USD'}\n\nВаш товар будет доставлен в ближайшее время. Спасибо за покупку!`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: orderData.telegramUserId,
              text: message,
              parse_mode: "Markdown",
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
