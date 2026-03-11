import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";
const MAX_TOPUP_AMOUNT = 1000;
const MIN_TOPUP_AMOUNT = 1;

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

  const authDate = params.get("auth_date");
  if (authDate) {
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(authDate) > 300) return null;
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
    const { initData, amount } = await req.json();

    // ─── Validate initData ───────────────────────
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
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
        JSON.stringify({ error: "Invalid authentication data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramUserId = tgUser.id;

    // ─── Validate amount ─────────────────────────
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_TOPUP_AMOUNT || numAmount > MAX_TOPUP_AMOUNT || !isFinite(numAmount)) {
      return new Response(
        JSON.stringify({ error: `Сумма должна быть от $${MIN_TOPUP_AMOUNT} до $${MAX_TOPUP_AMOUNT}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Check user is not blocked ───────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Rate limiting ─────────────────────────
    await supabase.from("rate_limits").delete().lt("created_at", new Date(Date.now() - 3600000).toISOString());
    const { count: recentTopups } = await supabase
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", String(telegramUserId))
      .eq("action", "topup")
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());

    if (recentTopups && recentTopups >= 10) {
      return new Response(
        JSON.stringify({ error: "Слишком много запросов на пополнение. Попробуйте позже." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("rate_limits").insert({
      identifier: String(telegramUserId),
      action: "topup",
    });

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

    // ─── Create CryptoBot invoice ────────────────
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
        amount: String(numAmount.toFixed(2)),
        description: `Пополнение баланса на $${numAmount.toFixed(2)}`,
        payload: JSON.stringify({
          type: "topup",
          telegramUserId,
          amount: numAmount,
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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
