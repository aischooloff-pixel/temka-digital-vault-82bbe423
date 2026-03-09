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
    const { amount, currency, description, orderNumber, telegramUserId, notes, items } = await req.json();
    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");

    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert user profile
    if (telegramUserId) {
      await supabase.from("user_profiles").upsert(
        { telegram_id: telegramUserId, updated_at: new Date().toISOString() },
        { onConflict: "telegram_id" }
      );
    }

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        telegram_id: telegramUserId || 0,
        status: "pending",
        payment_status: "unpaid",
        total_amount: parseFloat(amount),
        currency: currency || "USD",
        notes: notes || null,
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

    // Create CryptoBot invoice
    const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Crypto-Pay-API-Token": cryptobotToken,
      },
      body: JSON.stringify({
        currency_type: "fiat",
        fiat: currency || "USD",
        amount: String(amount),
        description: description || "Заказ в магазине",
        payload: JSON.stringify({ orderId: order.id, orderNumber, telegramUserId }),
        paid_btn_name: "callback",
        paid_btn_url: `https://t.me/${Deno.env.get("BOT_USERNAME") || "temkastore_bot"}`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      // Update order status to error
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
