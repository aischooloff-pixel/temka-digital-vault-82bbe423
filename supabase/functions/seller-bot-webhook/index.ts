import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const TG = (token: string) => {
  const call = (method: string, body: Record<string, unknown>) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => r.json());
  return {
    send: (chatId: number, text: string, markup?: unknown) =>
      call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }),
  };
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const WEBAPP_DOMAIN = Deno.env.get("WEBAPP_URL") || "https://temka-digital-vault.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id");

    if (!shopId) {
      console.error("seller-bot-webhook: no shop_id");
      return new Response("Missing shop_id", { status: 400 });
    }

    // Verify webhook secret
    const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    if (secret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== secret) {
        console.error("seller-bot-webhook: invalid secret");
        return new Response("Forbidden", { status: 403 });
      }
    }

    // Load shop and decrypt bot token
    const { data: shop } = await db().from("shops").select("id, name, slug, bot_token_encrypted, welcome_message, support_link, status").eq("id", shopId).single();
    if (!shop || shop.status !== "active") {
      console.error("seller-bot-webhook: shop not found or inactive", shopId);
      return new Response("ok");
    }

    if (!shop.bot_token_encrypted) {
      console.error("seller-bot-webhook: no bot token for shop", shopId);
      return new Response("ok");
    }

    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encKey) {
      console.error("seller-bot-webhook: TOKEN_ENCRYPTION_KEY not set");
      return new Response("ok");
    }

    const { data: botToken } = await db().rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: encKey });
    if (!botToken) {
      console.error("seller-bot-webhook: failed to decrypt bot token");
      return new Response("ok");
    }

    const tg = TG(botToken);
    const body = await req.json();
    const msg = body.message;

    if (!msg) return new Response("ok");

    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const firstName = msg.from?.first_name || "друг";

    // Handle /start command
    if (text === "/start" || text.startsWith("/start ")) {
      const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
      const welcomeText = shop.welcome_message || `Добро пожаловать в ${shop.name}!`;

      const greeting =
        `👋 Привет, <b>${esc(firstName)}</b>!\n\n` +
        `${esc(welcomeText)}\n\n` +
        `🛍 Откройте витрину чтобы посмотреть товары:`;

      const kb: Record<string, unknown> = {
        inline_keyboard: [
          [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
          ...(shop.support_link ? [[{ text: "🆘 Поддержка", url: shop.support_link }]] : []),
        ],
      };

      await tg.send(chatId, greeting, kb);
      return new Response("ok");
    }

    // Handle /help
    if (text === "/help") {
      const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
      const helpText =
        `ℹ️ <b>${esc(shop.name)}</b>\n\n` +
        `Это бот магазина ${esc(shop.name)}.\n` +
        `Нажмите кнопку ниже чтобы открыть витрину.`;

      await tg.send(chatId, helpText, {
        inline_keyboard: [
          [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
          ...(shop.support_link ? [[{ text: "🆘 Поддержка", url: shop.support_link }]] : []),
        ],
      });
      return new Response("ok");
    }

    // Default response for unknown messages
    const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
    await tg.send(chatId, `Используйте кнопку ниже для перехода в магазин 👇`, {
      inline_keyboard: [
        [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
      ],
    });

    return new Response("ok");
  } catch (e) {
    console.error("seller-bot-webhook error:", e);
    return new Response("error", { status: 500 });
  }
});
