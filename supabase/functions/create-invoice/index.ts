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
    const { amount, currency, description, orderNumber, telegramUserId, items, discountAmount, promoCode, balanceUsed, totalOriginal } = await req.json();
    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");

    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user is blocked
    if (telegramUserId) {
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("is_blocked")
        .eq("telegram_id", telegramUserId)
        .maybeSingle();

      if (userProfile?.is_blocked) {
        return new Response(
          JSON.stringify({ error: "Ваш аккаунт заблокирован" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("user_profiles").upsert(
        { telegram_id: telegramUserId, updated_at: new Date().toISOString() },
        { onConflict: "telegram_id" }
      );
    }

    // Check stock for all items
    if (items && items.length > 0) {
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock, title")
          .eq("id", item.productId)
          .single();

        if (!product || product.stock < item.quantity) {
          return new Response(
            JSON.stringify({ error: `Товар "${product?.title || item.productTitle}" закончился или недостаточно на складе` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        telegram_id: telegramUserId || 0,
        status: "pending",
        payment_status: "unpaid",
        total_amount: totalOriginal || parseFloat(amount),
        currency: currency || "USD",
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
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        product_title: item.productTitle,
        product_price: item.productPrice,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.error("Order items error:", itemsError);
      }
    }

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

    // Fetch dynamic exchange rate from CryptoBot
    const invoiceAmount = parseFloat(amount);
    
    const ratesResponse = await fetch(`${CRYPTOBOT_API_URL}/getExchangeRates`, {
      headers: { "Crypto-Pay-API-Token": cryptobotToken },
    });
    const ratesData = await ratesResponse.json();
    
    let cryptoAmount = String(invoiceAmount);
    let cryptoCurrency = "USDT";
    
    if (ratesData.ok && ratesData.result) {
      // Find USD → USDT rate
      const rate = ratesData.result.find(
        (r: any) => r.source === "USD" && r.target === "USDT" && r.is_valid
      );
      if (rate) {
        cryptoAmount = (invoiceAmount * parseFloat(rate.rate)).toFixed(2);
      }
    }
    
    console.log(`Converting $${invoiceAmount} USD → ${cryptoAmount} ${cryptoCurrency}`);
    
    const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Crypto-Pay-API-Token": cryptobotToken,
      },
      body: JSON.stringify({
        currency_type: "crypto",
        asset: cryptoCurrency,
        amount: cryptoAmount,
        description: description || "Заказ в магазине",
        payload: JSON.stringify({ orderId: order.id, orderNumber, telegramUserId, balanceUsed: balanceUsed || 0 }),
        paid_btn_name: "callback",
        paid_btn_url: `https://t.me/${Deno.env.get("BOT_USERNAME") || "temkastore_bot"}`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      await supabase.from("orders").update({ status: "error" }).eq("id", order.id);
      console.error("CryptoBot API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.name || "Failed to create invoice", details: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with invoice info
    await supabase.from("orders").update({
      invoice_id: String(data.result.invoice_id),
      pay_url: data.result.pay_url,
      status: "awaiting_payment",
      payment_status: "awaiting",
    }).eq("id", order.id);

    return new Response(
      JSON.stringify({
        invoiceId: data.result.invoice_id,
        payUrl: data.result.pay_url,
        miniAppUrl: data.result.mini_app_invoice_url,
        status: data.result.status,
        amount: data.result.amount,
        currency: data.result.fiat,
        orderNumber: orderNumber,
        orderId: order.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Invoice creation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
