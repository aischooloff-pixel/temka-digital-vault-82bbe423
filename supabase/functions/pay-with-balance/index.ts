import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telegramUserId, orderNumber, items, totalAmount, discountAmount, promoCode, balanceUsed } = await req.json();

    if (!telegramUserId || !orderNumber || !items?.length || !totalAmount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user has enough balance
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("balance")
      .eq("telegram_id", telegramUserId)
      .single();

    if (!profile || Number(profile.balance) < balanceUsed) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        telegram_id: telegramUserId,
        status: "paid",
        payment_status: "paid",
        total_amount: totalAmount,
        currency: "USD",
        discount_amount: discountAmount || 0,
        promo_code: promoCode || null,
        balance_used: balanceUsed || 0,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order", details: orderError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      product_title: item.productTitle,
      product_price: item.productPrice,
      quantity: item.quantity,
    }));
    await supabase.from("order_items").insert(orderItems);

    // Deduct balance
    const newBalance = Number(profile.balance) - balanceUsed;
    await supabase
      .from("user_profiles")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("telegram_id", telegramUserId);

    // Record balance history
    await supabase.from("balance_history").insert({
      telegram_id: telegramUserId,
      amount: -balanceUsed,
      balance_after: newBalance,
      type: "purchase",
      comment: `Заказ ${orderNumber}`,
      admin_telegram_id: telegramUserId,
    });

    // Increment promo used_count
    if (promoCode) {
      const { data: promo } = await supabase
        .from("promocodes")
        .select("id, used_count")
        .eq("code", promoCode)
        .maybeSingle();
      if (promo) {
        await supabase
          .from("promocodes")
          .update({ used_count: (promo.used_count || 0) + 1 })
          .eq("id", promo.id);
      }
    }

    // Auto-deliver inventory items
    const { data: oItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, product_title")
      .eq("order_id", order.id);

    const deliveredContent: string[] = [];
    let allDelivered = true;

    if (oItems) {
      for (const item of oItems) {
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
            .update({ status: "sold", order_id: order.id, sold_at: new Date().toISOString() })
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

    // Update order status
    const finalStatus = allDelivered && deliveredContent.length > 0 ? "delivered" : "paid";
    if (finalStatus !== "paid") {
      await supabase
        .from("orders")
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq("id", order.id);
    }

    // Send TG notification
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (botToken) {
      let message = `✅ <b>Оплата балансом подтверждена!</b>\n\n📦 Заказ: <code>${orderNumber}</code>\n💰 Списано: $${Number(balanceUsed).toFixed(2)}\n`;

      if (deliveredContent.length > 0) {
        message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные!`;
      } else {
        message += `\nВаш товар будет доставлен в ближайшее время.`;
      }

      message += `\n\nСпасибо за покупку!`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramUserId, text: message, parse_mode: "HTML" }),
      });
    }

    return new Response(
      JSON.stringify({ ok: true, orderNumber, orderId: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pay with balance error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
