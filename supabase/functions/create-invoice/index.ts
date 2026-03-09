import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { amount, currency, description, orderId, telegramUserId } = await req.json();
    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");

    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invoice via CryptoBot API
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
        payload: JSON.stringify({ orderId, telegramUserId }),
        paid_btn_name: "callback",
        paid_btn_url: `https://t.me/${Deno.env.get("BOT_USERNAME") || "temkastore_bot"}`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("CryptoBot API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.name || "Failed to create invoice", details: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        invoiceId: data.result.invoice_id,
        payUrl: data.result.pay_url,
        miniAppUrl: data.result.mini_app_invoice_url,
        status: data.result.status,
        amount: data.result.amount,
        currency: data.result.fiat,
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
