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
    const { initData, amount, shopId } = await req.json();

    // ─── Validate initData ───────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which bot token to use for initData validation
    let botToken: string | null = null;

    if (shopId) {
      // Multi-tenant: Mini App opened via seller bot — use seller's bot token
      console.log(`[topup] Tenant context: shopId=${shopId}`);
      const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
      if (!encryptionKey) {
        console.error("[topup] TOKEN_ENCRYPTION_KEY not set");
        return new Response(
          JSON.stringify({ error: "Ошибка конфигурации сервера" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shop, error: shopErr } = await supabase
        .from("shops")
        .select("bot_token_encrypted")
        .eq("id", shopId)
        .maybeSingle();

      if (shopErr || !shop?.bot_token_encrypted) {
        console.error("[topup] Shop not found or no bot token:", shopErr);
        return new Response(
          JSON.stringify({ error: "Бот магазина не подключён. Обратитесь к продавцу." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt seller bot token
      const { data: decrypted, error: decryptErr } = await supabase.rpc("decrypt_token", {
        p_encrypted: shop.bot_token_encrypted,
        p_key: encryptionKey,
      });

      if (decryptErr || !decrypted) {
        console.error("[topup] Failed to decrypt seller bot token:", decryptErr);
        return new Response(
          JSON.stringify({ error: "Ошибка расшифровки токена магазина" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      botToken = decrypted;
    } else {
      // Platform context: use global bot token
      botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || null;
    }

    if (!botToken) {
      console.error("[topup] No bot token available (shopId:", shopId, ")");
      return new Response(
        JSON.stringify({ error: "Бот не настроен. Обратитесь в поддержку." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!initData) {
      console.error("[topup] No initData provided");
      return new Response(
        JSON.stringify({ error: "Откройте приложение через Telegram" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tgUser = verifyAndExtractUser(initData, botToken);
    if (!tgUser) {
      console.error("[topup] initData validation failed");
      return new Response(
        JSON.stringify({ error: "Ошибка авторизации. Перезапустите Mini App." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramUserId = tgUser.id;
    console.log(`[topup] Authenticated user: ${telegramUserId}`);

    // ─── Validate amount ─────────────────────────
    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_TOPUP_AMOUNT || numAmount > MAX_TOPUP_AMOUNT || !isFinite(numAmount)) {
      return new Response(
        JSON.stringify({ error: `Сумма должна быть от $${MIN_TOPUP_AMOUNT} до $${MAX_TOPUP_AMOUNT}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Check user is not blocked ───────────────
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
      console.error("[topup] CRYPTOBOT_API_TOKEN not set");
      return new Response(
        JSON.stringify({ error: "Платёжная система не настроена. Обратитесь в поддержку." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[topup] Creating CryptoBot invoice for $${numAmount.toFixed(2)}`);

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
      console.error("[topup] CryptoBot API error:", JSON.stringify(data));
      const errorName = data.error?.name || "UNKNOWN";
      return new Response(
        JSON.stringify({ error: `Ошибка платёжной системы (${errorName}). Попробуйте позже.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[topup] Invoice created: ${data.result.invoice_id}`);

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
    console.error("[topup] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера. Попробуйте позже." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
