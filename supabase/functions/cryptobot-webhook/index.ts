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

    const secret = createHmac("sha256", "WebAppData").update(cryptobotToken).digest();
    const expectedSignature = createHmac("sha256", secret).update(body).digest("hex");

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

      // Handle balance top-up
      if (orderData.type === "topup") {
        const topupAmount = Number(orderData.amount);
        const telegramUserId = orderData.telegramUserId;

        console.log("Top-up payment confirmed:", { telegramUserId, topupAmount });

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("balance")
          .eq("telegram_id", telegramUserId)
          .single();

        const currentBalance = Number(profile?.balance || 0);
        const newBalance = currentBalance + topupAmount;

        await supabase
          .from("user_profiles")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("telegram_id", telegramUserId);

        await supabase.from("balance_history").insert({
          telegram_id: telegramUserId,
          amount: topupAmount,
          balance_after: newBalance,
          type: "credit",
          comment: `Пополнение через CryptoBot`,
          admin_telegram_id: telegramUserId,
        });

        // Send TG notification
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken) {
          const message = `✅ <b>Баланс пополнен!</b>\n\n💰 Сумма: $${topupAmount.toFixed(2)}\n💳 Новый баланс: $${newBalance.toFixed(2)}`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: telegramUserId, text: message, parse_mode: "HTML" }),
          });
        }

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle order payment (existing logic)
      console.log("Payment confirmed:", {
        invoiceId: invoice.invoice_id,
        amount: invoice.amount,
        orderId: orderData.orderId,
        telegramUserId: orderData.telegramUserId,
        balanceUsed: orderData.balanceUsed,
      });

      if (orderData.orderId) {
        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderData.orderId);

        // Deduct balance if balanceUsed > 0
        const balanceUsed = Number(orderData.balanceUsed || 0);
        if (balanceUsed > 0 && orderData.telegramUserId) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("balance")
            .eq("telegram_id", orderData.telegramUserId)
            .single();

          if (profile) {
            const newBalance = Math.max(0, Number(profile.balance) - balanceUsed);
            await supabase
              .from("user_profiles")
              .update({ balance: newBalance, updated_at: new Date().toISOString() })
              .eq("telegram_id", orderData.telegramUserId);

            await supabase.from("balance_history").insert({
              telegram_id: orderData.telegramUserId,
              amount: -balanceUsed,
              balance_after: newBalance,
              type: "purchase",
              comment: `Заказ ${orderData.orderNumber || orderData.orderId}`,
              admin_telegram_id: orderData.telegramUserId,
            });
          }
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
            const { data: invItems } = await supabase
              .from("inventory_items")
              .select("id, content")
              .eq("product_id", item.product_id)
              .eq("status", "available")
              .limit(item.quantity);

            if (invItems && invItems.length > 0) {
              const deliveredCount = Math.min(invItems.length, item.quantity);
              const ids = invItems.slice(0, deliveredCount).map(i => i.id);

              await supabase
                .from("inventory_items")
                .update({
                  status: "sold",
                  order_id: orderData.orderId,
                  sold_at: new Date().toISOString(),
                })
                .in("id", ids);

              deliveredContent.push(
                `📦 <b>${item.product_title}</b> (×${deliveredCount}):\n` +
                invItems.slice(0, deliveredCount).map(i => `<code>${i.content}</code>`).join("\n")
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
            .eq("id", orderData.orderId);
        }

        // Send confirmation via Telegram Bot
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken && orderData.telegramUserId) {
          let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${orderData.orderNumber || orderData.orderId}</code>\n💰 Сумма: ${invoice.amount} ${invoice.fiat || 'USD'}\n`;

          if (balanceUsed > 0) {
            message += `💳 С баланса: $${balanceUsed.toFixed(2)}\n`;
          }

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
