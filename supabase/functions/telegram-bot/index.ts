import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function setWebhook(botToken: string, webhookUrl: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    }
  );
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);

    // GET ?setup=true → auto-register webhook
    if (req.method === "GET" && url.searchParams.get("setup") === "true") {
      const webhookUrl = `${url.origin}/functions/v1/telegram-bot`;
      const result = await setWebhook(botToken, webhookUrl);
      return new Response(JSON.stringify({ webhook: webhookUrl, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const message = body?.message;

    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;
    const text = message.text || "";
    const firstName = message.from?.first_name || "друг";

    if (text === "/start") {
      const webAppUrl = Deno.env.get("WEBAPP_URL") || "https://id-preview--3e6a0b8a-0ee5-4d08-adbb-eb6aa31cf2e7.lovable.app";

      const replyText =
        `👋 Привет, ${firstName}!\n\n` +
        `Добро пожаловать в наш магазин цифровых товаров!\n\n` +
        `🛍 Аккаунты, ключи ПО и подписки\n` +
        `⚡ Мгновенная доставка\n` +
        `₿ Оплата через CryptoBot\n` +
        `🛡 Гарантия и поддержка\n\n` +
        `Нажмите кнопку ниже, чтобы открыть магазин 👇`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛒 Открыть магазин",
                  web_app: { url: webAppUrl },
                },
              ],
              [
                {
                  text: "📋 Каталог",
                  web_app: { url: `${webAppUrl}/catalog` },
                },
                {
                  text: "👤 Профиль",
                  web_app: { url: `${webAppUrl}/account` },
                },
              ],
              [
                {
                  text: "💬 Поддержка",
                  url: "https://t.me/paveldurov",
                },
              ],
            ],
          },
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram bot webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});