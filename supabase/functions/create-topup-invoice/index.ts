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
    const { amount, telegramUserId } = await req.json();

    if (!amount || !telegramUserId || Number(amount) <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount or user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Crypto-Pay-API-Token": cryptobotToken,
      },
      body: JSON.stringify({
        currency_type: "fiat",
        fiat: "USD",
        amount: String(Number(amount).toFixed(2)),
        description: `Пополнение баланса на $${Number(amount).toFixed(2)}`,
        payload: JSON.stringify({
          type: "topup",
          telegramUserId,
          amount: Number(amount),
        }),
        paid_btn_name: "callback",
        paid_btn_url: `https://t.me/${Deno.env.get("BOT_USERNAME") || "temkastore_bot"}`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("CryptoBot API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.name || "Failed to create invoice" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        invoiceId: data.result.invoice_id,
        payUrl: data.result.pay_url,
        miniAppUrl: data.result.mini_app_invoice_url,
        amount: data.result.amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Topup invoice error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
