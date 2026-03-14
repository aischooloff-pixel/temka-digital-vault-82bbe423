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
const MIN_TOPUP_AMOUNT = 0.1;

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
  try { return JSON.parse(userStr); } catch { return null; }
}

async function resolveShopByHint(supabase: any, shopHint: string) {
  const normalized = String(shopHint).trim();
  if (!normalized) return null;
  const { data: byId } = await supabase.from("shops").select("id, slug, bot_token_encrypted, bot_username, cryptobot_token_encrypted").eq("id", normalized).maybeSingle();
  if (byId) return byId;
  const { data: bySlug } = await supabase.from("shops").select("id, slug, bot_token_encrypted, bot_username, cryptobot_token_encrypted").eq("slug", normalized).maybeSingle();
  return bySlug || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { initData, amount, shopId, platform } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");

    let botToken: string | null = null;
    let cryptobotToken: string | null = null;
    let paidBtnBotUsername: string | null = null;
    let resolvedShopId: string | null = null;
    let resolvedShopSlug: string | null = null;
    const isPlatform = !!platform;

    if (shopId) {
      if (!encryptionKey) return new Response(JSON.stringify({ error: "Ошибка конфигурации сервера" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const shop = await resolveShopByHint(supabase, String(shopId));
      if (!shop?.bot_token_encrypted) return new Response(JSON.stringify({ error: "Бот магазина не подключён." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      resolvedShopId = shop.id;
      resolvedShopSlug = shop.slug || null;
      const { data: decryptedBot } = await supabase.rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: encryptionKey });
      if (!decryptedBot) return new Response(JSON.stringify({ error: "Ошибка расшифровки токена магазина" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      botToken = decryptedBot;
      paidBtnBotUsername = shop.bot_username || null;
      if (shop.cryptobot_token_encrypted) {
        const { data: decryptedCrypto } = await supabase.rpc("decrypt_token", { p_encrypted: shop.cryptobot_token_encrypted, p_key: encryptionKey });
        cryptobotToken = decryptedCrypto || null;
      }
    } else if (isPlatform) {
      botToken = Deno.env.get("PLATFORM_BOT_TOKEN") || null;
      cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN") || null;
      const botInfo = botToken ? await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then(r => r.json()).catch(() => null) : null;
      paidBtnBotUsername = botInfo?.result?.username || "ShopBotPlatform_bot";
    } else {
      botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || null;
      cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN") || null;
      paidBtnBotUsername = Deno.env.get("BOT_USERNAME") || "temkastore_bot";
    }

    if (!botToken) return new Response(JSON.stringify({ error: "Бот не настроен." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!initData) return new Response(JSON.stringify({ error: "Откройте приложение через Telegram" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const tgUser = verifyAndExtractUser(initData, botToken);
    if (!tgUser) return new Response(JSON.stringify({ error: "Ошибка авторизации." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const telegramUserId = tgUser.id;

    const numAmount = Number(amount);
    if (!numAmount || numAmount < MIN_TOPUP_AMOUNT || numAmount > MAX_TOPUP_AMOUNT || !isFinite(numAmount))
      return new Response(JSON.stringify({ error: `Сумма должна быть от $${MIN_TOPUP_AMOUNT} до $${MAX_TOPUP_AMOUNT}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Rate limiting
    await supabase.from("rate_limits").delete().lt("created_at", new Date(Date.now() - 3600000).toISOString());
    const { count: recentTopups } = await supabase.from("rate_limits").select("id", { count: "exact", head: true }).eq("identifier", String(telegramUserId)).eq("action", "topup").gte("created_at", new Date(Date.now() - 3600000).toISOString());
    if (recentTopups && recentTopups >= 10) return new Response(JSON.stringify({ error: "Слишком много запросов." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    await supabase.from("rate_limits").insert({ identifier: String(telegramUserId), action: "topup" });

    // Check blocked — use shop_customers for shop context
    if (resolvedShopId) {
      const { data: customer } = await supabase.from("shop_customers").select("is_blocked").eq("shop_id", resolvedShopId).eq("telegram_id", telegramUserId).maybeSingle();
      if (customer?.is_blocked) return new Response(JSON.stringify({ error: "Ваш аккаунт заблокирован" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else if (!isPlatform) {
      const { data: userProfile } = await supabase.from("user_profiles").select("is_blocked").eq("telegram_id", telegramUserId).maybeSingle();
      if (userProfile?.is_blocked) return new Response(JSON.stringify({ error: "Ваш аккаунт заблокирован" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!cryptobotToken) return new Response(JSON.stringify({ error: "Платёжная система не настроена." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const btnUrl = paidBtnBotUsername ? `https://t.me/${paidBtnBotUsername}` : `https://t.me/temkastore_bot`;

    const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Crypto-Pay-API-Token": cryptobotToken },
      body: JSON.stringify({
        currency_type: "fiat", fiat: "USD",
        amount: String(numAmount.toFixed(2)),
        description: isPlatform ? `Пополнение баланса платформы на $${numAmount.toFixed(2)}` : `Пополнение баланса на $${numAmount.toFixed(2)}`,
        payload: JSON.stringify({ type: isPlatform ? "platform_topup" : "topup", telegramUserId, amount: numAmount, shopId: resolvedShopId, shopSlug: resolvedShopSlug }),
        paid_btn_name: "callback", paid_btn_url: btnUrl,
      }),
    });

    const data = await response.json();
    if (!data.ok) return new Response(JSON.stringify({ error: `Ошибка платёжной системы (${data.error?.name || "UNKNOWN"}).` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ invoiceId: data.result.invoice_id, payUrl: data.result.pay_url, miniAppUrl: data.result.mini_app_invoice_url, amount: data.result.amount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[topup] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
