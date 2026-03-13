import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Webhook Setup (GET) ──────────────────────
async function setupWebhook(): Promise<Response> {
  const token = Deno.env.get("PLATFORM_BOT_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "PLATFORM_BOT_TOKEN not set" }), { status: 500 });
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/platform-bot`;
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message", "callback_query"], drop_pending_updates: true, ...(secret ? { secret_token: secret } : {}) }),
  });
  const data = await res.json();
  console.log("setWebhook result:", data);
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

// ─── Telegram API ─────────────────────────────
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
    edit: (chatId: number, msgId: number, text: string, markup?: unknown) =>
      call("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }),
    answer: (cbId: string, text?: string) =>
      call("answerCallbackQuery", { callback_query_id: cbId, ...(text ? { text, show_alert: true } : {}) }),
    getChatMember: (chatId: string, userId: number) =>
      call("getChatMember", { chat_id: chatId, user_id: userId }),
    deleteMessage: (chatId: number, msgId: number) =>
      call("deleteMessage", { chat_id: chatId, message_id: msgId }).catch(() => {}),
    sendPhoto: (chatId: number, photo: string, caption?: string, markup?: unknown) =>
      call("sendPhoto", { chat_id: chatId, photo, ...(caption ? { caption, parse_mode: "HTML" } : {}), ...(markup ? { reply_markup: markup } : {}) }),
    sendVideo: (chatId: number, video: string, caption?: string, markup?: unknown) =>
      call("sendVideo", { chat_id: chatId, video, ...(caption ? { caption, parse_mode: "HTML" } : {}), ...(markup ? { reply_markup: markup } : {}) }),
  };
};

// ─── Supabase ─────────────────────────────────
const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ─── Helpers ──────────────────────────────────
type Btn = { text: string; callback_data?: string; url?: string };
const btn = (t: string, cb: string): Btn => ({ text: t, callback_data: cb });
const urlBtn = (t: string, url: string): Btn => ({ text: t, url });
const ikb = (rows: Btn[][]) => ({ inline_keyboard: rows });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PLATFORM_NAME = "ShopBot Platform";
const WEBAPP_DOMAIN = Deno.env.get("WEBAPP_URL") || "https://temka-digital-vault.lovable.app";
const SUPPORT_LINK = "https://t.me/support";

// ─── Bot Token Validation ─────────────────────
async function validateBotToken(token: string): Promise<{ ok: boolean; bot_id?: number; bot_username?: string; first_name?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description || "Invalid token" };
    return { ok: true, bot_id: data.result.id, bot_username: data.result.username, first_name: data.result.first_name };
  } catch (e) {
    return { ok: false, error: "Network error validating token" };
  }
}

async function setupSellerWebhook(botToken: string, shopId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/seller-bot-webhook?shop_id=${shopId}`;
    const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"], drop_pending_updates: true, ...(secret ? { secret_token: secret } : {}) }),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description || "Failed to set webhook" };
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: [{ command: "start", description: "Открыть магазин" }, { command: "help", description: "Помощь" }] }),
    }).catch(() => {});
    const webappUrl = `${Deno.env.get("WEBAPP_URL") || "https://temka-digital-vault.lovable.app"}/shop/${shopId}`;
    await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_button: { type: "web_app", text: "🛍 Магазин", web_app: { url: webappUrl } } }),
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Network error setting webhook" };
  }
}

async function removeSellerWebhook(botToken: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
  } catch {}
}

async function connectBotToken(rawToken: string, shopId: string): Promise<{ ok: boolean; message: string; bot_username?: string }> {
  const validation = await validateBotToken(rawToken);
  if (!validation.ok) return { ok: false, message: `❌ Токен невалиден: ${validation.error}\n\nПроверьте токен и попробуйте снова.` };
  const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!encKey) return { ok: false, message: "❌ Ошибка конфигурации сервера (ключ шифрования)." };
  const { data: enc, error: encError } = await db().rpc("encrypt_token", { p_token: rawToken, p_key: encKey });
  if (encError || !enc) return { ok: false, message: `❌ Ошибка шифрования токена: ${encError?.message || "unknown"}` };
  const webhookResult = await setupSellerWebhook(rawToken, shopId);
  await db().from("shops").update({
    bot_token_encrypted: enc, bot_id: validation.bot_id, bot_username: validation.bot_username,
    webhook_status: webhookResult.ok ? "active" : "failed", bot_validated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", shopId);
  if (!webhookResult.ok) return { ok: false, message: `⚠️ Бот @${validation.bot_username} валиден, но webhook не установлен: ${webhookResult.error}`, bot_username: validation.bot_username };
  return { ok: true, message: `✅ Бот @${validation.bot_username} подключён!\n\n✅ Токен зашифрован\n✅ Webhook установлен\n✅ Бот готов к работе`, bot_username: validation.bot_username };
}

// ─── Session FSM ──────────────────────────────
async function getSession(tgId: number) {
  const { data } = await db().from("platform_sessions").select("*").eq("telegram_id", tgId).maybeSingle();
  return data as { telegram_id: number; state: string; data: Record<string, unknown> } | null;
}
async function setSession(tgId: number, state: string, data: Record<string, unknown> = {}) {
  await db().from("platform_sessions").upsert({ telegram_id: tgId, state, data, updated_at: new Date().toISOString() }, { onConflict: "telegram_id" });
}
async function clearSession(tgId: number) {
  await db().from("platform_sessions").delete().eq("telegram_id", tgId);
}

// ─── Platform OP channel resolution (DB → ENV fallback) ───
async function getPlatformChannelIds(): Promise<string[]> {
  // Try DB first (shop_settings key = 'platform_channel_id')
  const { data } = await db().from("shop_settings").select("value").eq("key", "platform_channel_id").single();
  // If DB has a record (even empty), respect it — don't fallback to env
  const raw = data ? (data.value || "") : (Deno.env.get("PLATFORM_CHANNEL_ID") || "");
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

async function getPlatformChannelLink(): Promise<string | null> {
  const { data } = await db().from("shop_settings").select("value").eq("key", "platform_channel_link").single();
  return data?.value || null;
}

// ─── Channel subscription check ───────────────
async function checkAllChannels(tg: ReturnType<typeof TG>, userId: number): Promise<boolean> {
  const channels = await getPlatformChannelIds();
  if (!channels.length) return true;
  for (const ch of channels) {
    try {
      const result = await tg.getChatMember(ch, userId);
      const status = result?.result?.status;
      if (!["member", "administrator", "creator"].includes(status)) return false;
    } catch { console.error(`Failed to check channel ${ch} for user ${userId}`); }
  }
  return true;
}

async function getChannelLinks(): Promise<{ id: string; link: string }[]> {
  const channels = await getPlatformChannelIds();
  const customLink = await getPlatformChannelLink();
  return channels.map((ch, i) => {
    const autoLink = ch.startsWith("@") ? `https://t.me/${ch.slice(1)}` : ch.startsWith("-100") ? `https://t.me/c/${ch.slice(4)}` : `https://t.me/${ch}`;
    return { id: ch, link: (i === 0 && customLink) ? customLink : autoLink };
  });
}

async function hasChannelRequirement(): Promise<boolean> {
  return (await getPlatformChannelIds()).length > 0;
}

async function channelButtons(): Promise<Btn[][]> {
  const channels = await getChannelLinks();
  if (!channels.length) return [];
  const row: Btn[] = channels.map((ch, i) => urlBtn(`📢 ${channels.length > 1 ? `Канал ${i + 1}` : "Подписаться"}`, ch.link));
  return [row, [btn("✅ Проверить подписку", "p:checksub")]];
}

async function showSubscribeGate(tg: ReturnType<typeof TG>, chatId: number, firstName?: string): Promise<void> {
  const channels = await getChannelLinks();
  const channelList = channels.length > 1 ? channels.map((ch, i) => `  ${i + 1}. ${ch.id}`).join("\n") : "";
  const text = `🔒 <b>Подписка на канал обязательна</b>\n\nДля использования <b>${PLATFORM_NAME}</b> необходимо подписаться на ${channels.length > 1 ? "наши каналы" : "наш канал"}.\n` +
    (channelList ? `\n${channelList}\n` : "") + `\nПосле подписки нажми кнопку «✅ Проверить подписку».`;
  const rows: Btn[][] = [];
  for (const ch of channels) rows.push([urlBtn(`📢 ${channels.length > 1 ? ch.id : "Подписаться на канал"}`, ch.link)]);
  rows.push([btn("✅ Проверить подписку", "p:checksub")]);
  await tg.send(chatId, text, ikb(rows));
}

async function enforceSubscription(tg: ReturnType<typeof TG>, chatId: number, firstName?: string): Promise<boolean> {
  if (!(await hasChannelRequirement())) return true;
  const subscribed = await checkAllChannels(tg, chatId);
  if (subscribed) return true;
  await showSubscribeGate(tg, chatId, firstName);
  return false;
}

// ─── Upsert platform user ─────────────────────
async function upsertUser(from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  const { data: existing } = await db().from("platform_users").select("id").eq("telegram_id", from.id).maybeSingle();
  const fields = { first_name: from.first_name || "", last_name: from.last_name || null, username: from.username || null, is_premium: from.is_premium || false, language_code: from.language_code || null, updated_at: new Date().toISOString() };
  if (existing) { await db().from("platform_users").update(fields).eq("telegram_id", from.id); return existing; }
  const { data } = await db().from("platform_users").insert({ telegram_id: from.id, ...fields }).select("id").single();
  return data;
}

// ─── Bottom panel (keyboard) ──────────────────
const bottomPanel = () => ({ keyboard: [[{ text: "👤 Профиль" }, { text: "🆘 Поддержка" }], [{ text: "🏪 Создать магазин" }]], resize_keyboard: true, is_persistent: true });

// ─── Welcome message from DB ─────────────────
async function getWelcomeConfig(): Promise<{ text: string; media_type?: string; media_url?: string }> {
  const { data: rows } = await db().from("shop_settings").select("key, value").in("key", ["platform_welcome_text", "platform_welcome_media_type", "platform_welcome_media_url"]);
  const map: Record<string, string> = {};
  for (const r of rows || []) map[r.key] = r.value;
  return {
    text: map["platform_welcome_text"] || "",
    media_type: map["platform_welcome_media_type"] || undefined,
    media_url: map["platform_welcome_media_url"] || undefined,
  };
}

// ═══════════════════════════════════════════════
// WELCOME / START
// ═══════════════════════════════════════════════
async function sendWelcome(tg: ReturnType<typeof TG>, chatId: number, firstName: string) {
  const config = await getWelcomeConfig();
  const defaultText = `👋 Привет, <b>${esc(firstName)}</b>!\nДобро пожаловать в <b>${PLATFORM_NAME}</b>\n\nСоздай свой Telegram магазин\nс автовыдачей за 5 минут.\n\n— Никакого кода и хостинга\n— Автовыдача товаров 24/7\n— Приём крипты через CryptoBot\n— Полная настройка под себя`;
  const welcomeText = config.text ? config.text.replace(/\{name\}/g, esc(firstName)) : defaultText;
  const kb = { ...ikb([[btn("🏪 Создать магазин", "p:create"), btn("📖 Как это работает", "p:howitworks")], [btn("👤 Мой профиль", "p:profile")], [btn("🏪 Мои магазины", "p:myshops:0")]]) };

  if (config.media_type === "photo" && config.media_url) {
    await tg.sendPhoto(chatId, config.media_url, welcomeText, kb);
  } else if (config.media_type === "video" && config.media_url) {
    await tg.sendVideo(chatId, config.media_url, welcomeText, kb);
  } else {
    await tg.send(chatId, welcomeText, kb);
  }
  await tg.send(chatId, "⬇️ Используй меню внизу для навигации", bottomPanel());
}

// ═══════════════════════════════════════════════
// HOW IT WORKS
// ═══════════════════════════════════════════════
function howItWorks(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const text = `📖 <b>Как это работает?</b>\n\n1️⃣ <b>Создай магазин</b> — пройди простой онбординг из 7 шагов\n\n2️⃣ <b>Добавь товары</b> — загрузи инвентарь прямо в бота\n\n3️⃣ <b>Подключи оплату</b> — CryptoBot принимает крипту автоматически\n\n4️⃣ <b>Поделись ссылкой</b> — клиенты покупают через твоего бота\n\n5️⃣ <b>Автовыдача 24/7</b> — товар доставляется мгновенно после оплаты\n\n💰 Стоимость: <b>$9/мес</b> — неограниченные магазины и товары`;
  return tg.edit(chatId, msgId, text, ikb([[btn("🏪 Создать магазин", "p:create")], [btn("◀️ Назад", "p:home")]]));
}

// ═══════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════
async function showProfile(tg: ReturnType<typeof TG>, chatId: number, msgId?: number) {
  const { data: user } = await db().from("platform_users").select("*").eq("telegram_id", chatId).maybeSingle();
  if (!user) return;
  const { count: shopCount } = await db().from("shops").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  const subMap: Record<string, string> = { active: "Активна", trial: "Пробный", expired: "Истекла", cancelled: "Отменена" };
  const subStatus = subMap[user.subscription_status] || user.subscription_status;
  const text = `👤 <b>${esc(user.first_name)}${user.last_name ? " " + esc(user.last_name) : ""}</b>\n\nМагазинов: <b>${shopCount || 0}</b>\nПодписка: <b>${subStatus}</b>`;
  const profileUrl = `${WEBAPP_DOMAIN}/account`;
  const kb = ikb([[urlBtn("Открыть профиль", profileUrl)], [btn("Мои магазины", "p:myshops:0")], [btn("Подписка", "p:sub")], [btn("◀️ Назад", "p:home")]]);
  if (msgId) return tg.edit(chatId, msgId, text, kb);
  return tg.send(chatId, text, kb);
}

// ═══════════════════════════════════════════════
// MY SHOPS
// ═══════════════════════════════════════════════
async function myShops(tg: ReturnType<typeof TG>, chatId: number, msgId?: number, page = 0) {
  const { data: user } = await db().from("platform_users").select("id").eq("telegram_id", chatId).maybeSingle();
  if (!user) return;
  const { data: shops } = await db().from("shops").select("*").eq("owner_id", user.id).order("created_at");
  if (!shops?.length) {
    const text = "🏪 <b>Мои магазины</b>\n\n📭 У тебя пока нет магазинов.\n\nСоздай свой первый Telegram магазин\nс автовыдачей за несколько минут!";
    const kb = ikb([[btn("🏪 Создать первый магазин", "p:create")], [btn("📖 Как это работает", "p:howitworks")], [btn("◀️ Назад", "p:home")]]);
    return msgId ? tg.edit(chatId, msgId, text, kb) : tg.send(chatId, text, kb);
  }
  const perPage = 5;
  const totalP = Math.ceil(shops.length / perPage);
  const p = Math.min(Math.max(0, page), totalP - 1);
  const slice = shops.slice(p * perPage, (p + 1) * perPage);
  let text = `🏪 <b>Мои магазины</b> (${shops.length})\n\n`;
  const rows: Btn[][] = slice.map(s => {
    const dot = s.status === "active" ? "🟢" : "🔴";
    return [btn(`${dot} ${s.name}`, `p:shop:${s.id}`)];
  });
  if (totalP > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `p:myshops:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalP}`, "p:noop"));
    if (p < totalP - 1) nav.push(btn("▶️", `p:myshops:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("➕ Создать магазин", "p:create")]);
  rows.push([btn("◀️ Назад", "p:home")]);
  return msgId ? tg.edit(chatId, msgId, text, ikb(rows)) : tg.send(chatId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// SHOP VIEW
// ═══════════════════════════════════════════════
async function shopView(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return tg.edit(chatId, msgId, "❌ Магазин не найден", ikb([[btn("◀️ Назад", "p:myshops:0")]]));
  const { count: productCount } = await db().from("shop_products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: orderCount } = await db().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
  const statusEmoji = shop.status === "active" ? "🟢" : "🔴";
  const text = `🏪 <b>${esc(shop.name)}</b>\n\n📊 Статус: ${shop.status === "active" ? "активен" : "остановлен"} ${statusEmoji}\n🔗 ${esc(shopUrl)}\n📦 Товаров: ${productCount || 0}\n🛍 Продаж: ${orderCount || 0}`;
  return tg.edit(chatId, msgId, text, ikb([
    [btn("📋 Скопировать ссылку", `p:copylink:${shopId}`)],
    [btn("⚙️ Настройки", `p:settings:${shopId}`)],
    [btn("🗑 Удалить", `p:delshop:${shopId}`)],
    [btn("◀️ К магазинам", "p:myshops:0")],
  ]));
}

// ═══════════════════════════════════════════════
// SHOP SETTINGS
// ═══════════════════════════════════════════════
async function shopSettings(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return tg.edit(chatId, msgId, "❌ Не найден", ikb([[btn("◀️ Назад", "p:myshops:0")]]));
  let botStatus = "❌ не подключён";
  if (shop.bot_token_encrypted) {
    if (shop.bot_username && shop.webhook_status === "active") botStatus = `✅ @${shop.bot_username} (webhook активен)`;
    else if (shop.bot_username && shop.webhook_status === "failed") botStatus = `⚠️ @${shop.bot_username} (webhook не установлен)`;
    else if (shop.bot_username) botStatus = `✅ @${shop.bot_username} (webhook: ${shop.webhook_status})`;
    else botStatus = "⚠️ токен сохранён, не валидирован";
  }
  let opStatus = "❌ выключена";
  if (shop.is_subscription_required) {
    opStatus = shop.required_channel_id ? `✅ включена (${shop.required_channel_link || shop.required_channel_id})` : "⚠️ включена, канал не указан";
  }
  const text = `⚙️ <b>Настройки: ${esc(shop.name)}</b>\n\n📛 Название: ${esc(shop.name)}\n🎨 Цвет: ${shop.color}\n📌 Заголовок: ${shop.hero_title || "—"}\n📝 Описание: ${shop.hero_description ? esc(shop.hero_description.slice(0, 60)) + "…" : "—"}\n👋 Приветствие: ${shop.welcome_message ? esc(shop.welcome_message.slice(0, 50)) + "…" : "—"}\n🔗 Поддержка: ${shop.support_link || "—"}\n🤖 Бот: ${botStatus}\n💰 CryptoBot: ${shop.cryptobot_token_encrypted ? "✅ подключён" : "❌ не подключён"}\n📢 ОП: ${opStatus}`;
  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Название", `p:edit:${shopId}:name`), btn("🎨 Цвет", `p:edit:${shopId}:color`)],
    [btn("📌 Заголовок витрины", `p:edit:${shopId}:hero_title`)],
    [btn("📝 Описание витрины", `p:edit:${shopId}:hero_desc`)],
    [btn("👋 Приветствие", `p:edit:${shopId}:welcome`), btn("🔗 Поддержка", `p:edit:${shopId}:support`)],
    [btn("🤖 Токен бота", `p:setbot:${shopId}`), btn("💰 CryptoBot", `p:setcb:${shopId}`)],
    [btn(`📢 ОП ${shop.is_subscription_required ? "✅" : "❌"}`, `p:opsettings:${shopId}`)],
    [btn("◀️ К магазину", `p:shop:${shopId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════
async function shopStats(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("name").eq("id", shopId).single();
  const { count: totalOrders } = await db().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: paidOrders } = await db().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("payment_status", "paid");
  const { data: revenue } = await db().from("shop_orders").select("total_amount").eq("shop_id", shopId).eq("payment_status", "paid");
  const totalRevenue = revenue?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const { count: productCount } = await db().from("shop_products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: invCount } = await db().from("shop_inventory").select("id", { count: "exact", head: true })
    .eq("status", "available")
    .in("product_id", (await db().from("shop_products").select("id").eq("shop_id", shopId)).data?.map(p => p.id) || []);
  const text = `📊 <b>Статистика: ${esc(shop?.name || "")}</b>\n\n🛍 Всего заказов: ${totalOrders || 0}\n✅ Оплаченных: ${paidOrders || 0}\n💰 Выручка: <b>$${totalRevenue.toFixed(2)}</b>\n\n📦 Товаров: ${productCount || 0}\n🗃 На складе: ${invCount || 0} единиц`;
  return tg.edit(chatId, msgId, text, ikb([[btn("◀️ К магазину", `p:shop:${shopId}`)]]));
}

// ═══════════════════════════════════════════════
// SUBSCRIPTION
// ═══════════════════════════════════════════════
async function showSubscription(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const { data: user } = await db().from("platform_users").select("*").eq("telegram_id", chatId).maybeSingle();
  if (!user) return;
  const subMap: Record<string, string> = { active: "✅ Активна", trial: "🆓 Пробный", expired: "❌ Истекла" };
  let daysLeft = "";
  if (user.subscription_expires_at) {
    const diff = Math.ceil((new Date(user.subscription_expires_at).getTime() - Date.now()) / 86400000);
    daysLeft = diff > 0 ? `\n⏳ Осталось: <b>${diff}</b> дней` : "";
  }
  const text = `💳 <b>Подписка</b>\n\n📊 Статус: <b>${subMap[user.subscription_status] || user.subscription_status}</b>${daysLeft}\n\n💰 Стоимость: <b>$9/мес</b>\n\nВключает:\n• Неограниченное кол-во магазинов\n• Приём платежей через CryptoBot\n• Собственный Telegram-бот\n• Авто-доставка цифровых товаров`;
  const rows: Btn[][] = [];
  if (user.subscription_status !== "active") {
    rows.push([btn("💳 Оплатить $9", "p:pay_sub")]);
    rows.push([btn("🎫 У меня есть промокод", "p:sub_promo")]);
  }
  rows.push([btn("◀️ Назад", "p:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// CREATE SHOP — 7-STEP WIZARD
// ═══════════════════════════════════════════════
const COLORS: Record<string, string> = { red: "#E53935", blue: "#2B7FFF", green: "#43A047", purple: "#8E24AA", black: "#212121", orange: "#FB8C00" };
const WIZARD_CALLBACK_COMMANDS = new Set(["wcolor", "wback", "confirm_create", "accept_terms", "wcancel"]);
const WIZARD_STALE_TEXT = "⚠️ Этот шаг больше неактуален. Магазин уже создан или сценарий завершён.";
const WIZARD_FINAL_TEXT = "✅ Сценарий завершён. Этот шаг больше неактуален.";

function extractWizardMessageIds(sData: Record<string, unknown>): number[] {
  const raw = sData.wizard_message_ids;
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
}

function trackWizardMessage(sData: Record<string, unknown>, msgId?: number): Record<string, unknown> {
  if (!msgId) return sData;
  const ids = extractWizardMessageIds(sData);
  if (!ids.includes(msgId)) ids.push(msgId);
  return { ...sData, wizard_active_message_id: msgId, wizard_message_ids: ids.slice(-20) };
}

async function persistWizardSession(chatId: number, state: string, sData: Record<string, unknown>, msgId?: number) {
  const nextData = trackWizardMessage(sData, msgId);
  await setSession(chatId, state, nextData);
  return nextData;
}

function expectedWizardStates(cmd: string, parts: string[]): string[] {
  if (cmd === "wcolor") return ["wiz_2"];
  if (cmd === "confirm_create") return ["wiz_confirm"];
  if (cmd === "accept_terms") return ["wiz_legal"];
  if (cmd === "wcancel") return ["wiz_1", "wiz_2", "wiz_2_custom", "wiz_3", "wiz_4", "wiz_5", "wiz_6", "wiz_7", "wiz_confirm", "wiz_legal"];
  if (cmd === "wback") {
    const step = parseInt(parts[2]) || 1;
    const map: Record<number, string[]> = { 1: ["wiz_2"], 2: ["wiz_3", "wiz_2_custom"], 3: ["wiz_4"], 4: ["wiz_5"], 5: ["wiz_6"], 6: ["wiz_7"], 7: ["wiz_confirm"] };
    return map[step] || [];
  }
  return [];
}

async function markWizardCallbackAsStale(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  try { await tg.edit(chatId, msgId, WIZARD_STALE_TEXT); } catch {}
}

async function validateWizardCallback(tg: ReturnType<typeof TG>, chatId: number, msgId: number, cmd: string, parts: string[], session: Awaited<ReturnType<typeof getSession>>): Promise<boolean> {
  if (!session) { await markWizardCallbackAsStale(tg, chatId, msgId); return false; }
  if (cmd === "accept_terms" && session.state === "wiz_finalizing") return false;
  const es = expectedWizardStates(cmd, parts);
  if (!es.includes(session.state)) { await markWizardCallbackAsStale(tg, chatId, msgId); return false; }
  const activeMsgId = Number((session.data as Record<string, unknown>)?.wizard_active_message_id);
  if (Number.isInteger(activeMsgId) && activeMsgId > 0 && activeMsgId !== msgId) { await markWizardCallbackAsStale(tg, chatId, msgId); return false; }
  return true;
}

async function deactivateWizardMessages(tg: ReturnType<typeof TG>, chatId: number, sData: Record<string, unknown>, keepMsgId?: number) {
  const ids = extractWizardMessageIds(sData).filter((id) => id !== keepMsgId);
  await Promise.all(ids.map(async (id) => { try { await tg.edit(chatId, id, WIZARD_FINAL_TEXT); } catch {} }));
}

async function wizardStep(tg: ReturnType<typeof TG>, chatId: number, step: number, sData: Record<string, unknown>, msgId?: number) {
  let text = ""; let kb: Btn[][] = []; let nextState = "wiz_1";
  const cancelRow = [btn("❌ Отмена", "p:wcancel")];
  switch (step) {
    case 1: text = `📝 <b>Шаг 1 из 7</b>\n\nВведи название своего магазина\n\nНапример: <i>NickShop, Digital Store</i>`; kb = [cancelRow]; nextState = "wiz_1"; break;
    case 2: text = `🎨 <b>Шаг 2 из 7</b>\n\nВыбери цвет интерфейса магазина`; kb = [[btn("🔴 Красный", "p:wcolor:red"), btn("🔵 Синий", "p:wcolor:blue")], [btn("🟢 Зелёный", "p:wcolor:green"), btn("🟣 Фиолетовый", "p:wcolor:purple")], [btn("⚫ Чёрный", "p:wcolor:black"), btn("🟠 Оранжевый", "p:wcolor:orange")], [btn("✏️ Ввести HEX", "p:wcolor:custom")], [btn("◀️ Назад", "p:wback:1")], cancelRow]; nextState = "wiz_2"; break;
    case 3: text = `📌 <b>Шаг 3 из 7</b>\n\nВведи заголовок витрины\n<i>(крупный текст на главной странице магазина)</i>\n\nНапример: <i>Премиум цифровой маркетплейс</i>`; kb = [[btn("◀️ Назад", "p:wback:2")], cancelRow]; nextState = "wiz_3"; break;
    case 4: text = `📝 <b>Шаг 4 из 7</b>\n\nВведи описание витрины\n<i>(подзаголовок под заголовком)</i>\n\nНапример: <i>Проверенные аккаунты и скрипты.\nМгновенная доставка.</i>`; kb = [[btn("◀️ Назад", "p:wback:3")], cancelRow]; nextState = "wiz_4"; break;
    case 5: text = `👋 <b>Шаг 5 из 7</b>\n\nВведи приветственное сообщение для покупателей`; kb = [[btn("◀️ Назад", "p:wback:4")], cancelRow]; nextState = "wiz_5"; break;
    case 6: text = `🔗 <b>Шаг 6 из 7</b>\n\nВведи ссылку на поддержку\n\nНапример: <i>https://t.me/nickname</i>`; kb = [[btn("◀️ Назад", "p:wback:5")], cancelRow]; nextState = "wiz_6"; break;
    case 7: text = `🤖 <b>Шаг 7 из 7</b>\n\nВведи API токен своего Telegram бота\n\nКак получить:\n1. Открой @BotFather\n2. Напиши /newbot\n3. Следуй инструкции\n4. Скопируй токен`; kb = [[urlBtn("📖 Подробная инструкция", "https://core.telegram.org/bots/tutorial")], [btn("◀️ Назад", "p:wback:6")], cancelRow]; nextState = "wiz_7"; break;
  }
  if (msgId) { const res = await tg.edit(chatId, msgId, text, ikb(kb)); await persistWizardSession(chatId, nextState, sData, msgId); return res; }
  const res = await tg.send(chatId, text, ikb(kb));
  const sentMsgId = res?.result?.message_id;
  await persistWizardSession(chatId, nextState, sData, sentMsgId);
  return res;
}

async function showConfirmation(tg: ReturnType<typeof TG>, chatId: number, sData: Record<string, unknown>, msgId?: number) {
  const colorName = Object.entries(COLORS).find(([, v]) => v === sData.color)?.[0] || sData.color;
  const botValidation = await validateBotToken(sData.bot_token as string);
  const botStatusText = botValidation.ok ? `✅ @${botValidation.bot_username}` : `❌ Невалиден (${botValidation.error})`;
  sData.bot_valid = botValidation.ok; sData.bot_username = botValidation.bot_username || null; sData.bot_id = botValidation.bot_id || null;
  const text = `✅ <b>Проверь данные магазина:</b>\n\n🏪 Название: <b>${esc(sData.name as string)}</b>\n🎨 Цвет: ${colorName}\n📌 Заголовок: ${esc(sData.hero_title as string || "—")}\n📝 Описание: ${esc(sData.hero_desc as string || "—")}\n👋 Приветствие: ${esc((sData.welcome as string || "—").slice(0, 80))}\n🔗 Поддержка: ${esc(sData.support as string || "—")}\n🤖 Бот: ${botStatusText}`;
  const kb = botValidation.ok
    ? ikb([[btn("✅ Всё верно", "p:confirm_create"), btn("✏️ Изменить", "p:wback:1")], [btn("❌ Отмена", "p:wcancel")]])
    : ikb([[btn("🔄 Другой токен", "p:wback:7"), btn("✏️ Изменить", "p:wback:1")], [btn("❌ Отмена", "p:wcancel")]]);
  if (msgId) { const res = await tg.edit(chatId, msgId, text, kb); await persistWizardSession(chatId, "wiz_confirm", sData, msgId); return res; }
  const res = await tg.send(chatId, text, kb);
  await persistWizardSession(chatId, "wiz_confirm", sData, res?.result?.message_id);
  return res;
}

async function showLegalAgreement(tg: ReturnType<typeof TG>, chatId: number, sData: Record<string, unknown>, msgId?: number) {
  const legalUrl = `${WEBAPP_DOMAIN}/platform/terms`;
  const privacyUrl = `${WEBAPP_DOMAIN}/platform/privacy`;
  const disclaimerUrl = `${WEBAPP_DOMAIN}/platform/disclaimer`;
  const text = `📜 <b>Правовое соглашение</b>\n\nПеред созданием магазина ознакомьтесь:\n\n📋 <a href="${legalUrl}">Условия использования</a>\n🔒 <a href="${privacyUrl}">Политика конфиденциальности</a>\n⚠️ <a href="${disclaimerUrl}">Отказ от ответственности</a>\n\nНажимая «Принимаю», вы подтверждаете согласие.`;
  if (msgId) { const res = await tg.edit(chatId, msgId, text, ikb([[btn("✅ Принимаю", "p:accept_terms")], [btn("◀️ Назад", "p:wback:7")], [btn("❌ Отмена", "p:wcancel")]])); await persistWizardSession(chatId, "wiz_legal", sData, msgId); return res; }
  const res = await tg.send(chatId, text, ikb([[btn("✅ Принимаю", "p:accept_terms")], [btn("◀️ Назад", "p:wback:7")], [btn("❌ Отмена", "p:wcancel")]]));
  await persistWizardSession(chatId, "wiz_legal", sData, res?.result?.message_id);
  return res;
}

async function finalizeShop(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const session = await getSession(chatId);
  if (!session || session.state !== "wiz_legal") return;
  const sData = { ...(session.data || {}) } as Record<string, unknown>;
  const finalizingData = trackWizardMessage(sData, msgId);
  await setSession(chatId, "wiz_finalizing", finalizingData);
  await tg.edit(chatId, msgId, "⏳ Создаю магазин...");
  const { data: user } = await db().from("platform_users").select("id").eq("telegram_id", chatId).maybeSingle();
  if (!user) { await clearSession(chatId); return tg.edit(chatId, msgId, "❌ Ошибка: пользователь не найден.", ikb([[btn("◀️ Меню", "p:home")]])); }
  const name = (sData.name as string) || "Мой магазин";
  const baseSlug = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "shop";
  let slug = baseSlug; let attempt = 0;
  while (true) {
    const { data: ex } = await db().from("shops").select("id").eq("slug", slug).maybeSingle();
    if (!ex) break;
    attempt++; slug = `${baseSlug}-${attempt}`;
  }
  const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  let botTokenEnc: string | null = null; let botId: number | null = null; let botUsername: string | null = null; let webhookStatus = "none";
  if (sData.bot_token && sData.bot_valid && encKey) {
    const { data: enc, error: encErr } = await db().rpc("encrypt_token", { p_token: sData.bot_token as string, p_key: encKey });
    if (encErr) console.error("finalizeShop: encryption error", encErr);
    botTokenEnc = enc; botId = (sData.bot_id as number) || null; botUsername = (sData.bot_username as string) || null;
  }
  const { data: shop, error } = await db().from("shops").insert({
    name, slug, owner_id: user.id, status: "active", color: (sData.color as string) || "#2B7FFF",
    hero_title: (sData.hero_title as string) || "", hero_description: (sData.hero_desc as string) || "",
    welcome_message: (sData.welcome as string) || "", support_link: (sData.support as string) || "",
    bot_token_encrypted: botTokenEnc, bot_id: botId, bot_username: botUsername, webhook_status: webhookStatus,
  }).select("id, slug").single();
  if (error || !shop) { await clearSession(chatId); return tg.edit(chatId, msgId, `❌ Ошибка: ${error?.message || "unknown"}`, ikb([[btn("◀️ Меню", "p:home")]])); }
  let botStatusMsg = "";
  if (sData.bot_token && sData.bot_valid) {
    const whResult = await setupSellerWebhook(sData.bot_token as string, shop.id);
    await db().from("shops").update({ webhook_status: whResult.ok ? "active" : "failed", bot_validated_at: new Date().toISOString() }).eq("id", shop.id);
    botStatusMsg = whResult.ok ? `\n\n🤖 Бот @${botUsername} подключён и готов к работе!` : `\n\n⚠️ Бот @${botUsername} сохранён, но webhook не установлен: ${whResult.error}`;
  }
  await deactivateWizardMessages(tg, chatId, finalizingData, msgId);
  await clearSession(chatId);
  const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
  const text = `🎉 <b>Магазин создан!</b>\n\nВот твоя ссылка:\n${esc(shopUrl)}${botStatusMsg}`;
  return tg.edit(chatId, msgId, text, ikb([[btn("📋 Скопировать ссылку", `p:copylink:${shop.id}`)], [btn("⚙️ Настройки", `p:settings:${shop.id}`)], [btn("◀️ Меню", "p:home")]]));
}

// ═══════════════════════════════════════════════
// DELETE SHOP
// ═══════════════════════════════════════════════
async function deleteShopConfirm(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("name").eq("id", shopId).single();
  return tg.edit(chatId, msgId, `🗑 <b>Удаление магазина</b>\n\nВы уверены что хотите удалить <b>${esc(shop?.name || "")}</b>?\n\n⚠️ Это действие необратимо. Все товары и заказы будут удалены.`, ikb([[btn("🗑 Да, удалить", `p:confirmdelete:${shopId}`), btn("❌ Нет", `p:shop:${shopId}`)]]));
}

async function deleteShopExecute(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("bot_token_encrypted").eq("id", shopId).single();
  if (shop?.bot_token_encrypted) {
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (encKey) { try { const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: encKey }); if (rawToken) await removeSellerWebhook(rawToken); } catch {} }
  }
  const { data: products } = await db().from("shop_products").select("id").eq("shop_id", shopId);
  const prodIds = products?.map(p => p.id) || [];
  if (prodIds.length) { await db().from("shop_inventory").delete().in("product_id", prodIds); await db().from("shop_order_items").delete().in("product_id", prodIds); }
  await db().from("shop_reviews").delete().eq("shop_id", shopId);
  await db().from("shop_promocodes").delete().eq("shop_id", shopId);
  await db().from("shop_admin_logs").delete().eq("shop_id", shopId);
  await db().from("shop_products").delete().eq("shop_id", shopId);
  await db().from("shop_orders").delete().eq("shop_id", shopId);
  await db().from("shop_categories").delete().eq("shop_id", shopId);
  await db().from("shop_balance_history").delete().eq("shop_id", shopId);
  await db().from("shop_customers").delete().eq("shop_id", shopId);
  await db().from("shops").delete().eq("id", shopId);
  return tg.edit(chatId, msgId, "✅ Магазин удалён.", ikb([[btn("◀️ К магазинам", "p:myshops:0")]]));
}

function howToAddProducts(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const text = `📦 <b>Как добавить товары</b>\n\n1. Перейди в ⚙️ <b>Настройки</b> магазина\n2. Управление товарами будет доступно через бот продавца\n3. Загрузи инвентарь — каждая строка = 1 единица товара\n\n💡 Товары появятся в твоём магазине автоматически!`;
  return tg.edit(chatId, msgId, text, ikb([[btn("⚙️ Настройки", `p:settings:${shopId}`)], [btn("◀️ К магазину", `p:shop:${shopId}`)]]));
}

// ═══════════════════════════════════════════════
// TEXT FSM HANDLER
// ═══════════════════════════════════════════════
async function handleText(tg: ReturnType<typeof TG>, chatId: number, text: string, from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  if (await hasChannelRequirement()) {
    const subscribed = await checkAllChannels(tg, chatId);
    if (!subscribed) { await showSubscribeGate(tg, chatId, from.first_name); return; }
  }
  const session = await getSession(chatId);
  if (!session) return;
  const state = session.state;
  const sData = { ...(session.data || {}) } as Record<string, unknown>;
  const val = text.trim();

  // ─── ADM FSM states ─────────────────────
  if (state.startsWith("adm_")) return handleAdmText(tg, chatId, val, state, sData);

  // ─── Wizard steps ─────────────────────────
  if (state === "wiz_1") { if (val.length < 2 || val.length > 50) return tg.send(chatId, "❌ Название: от 2 до 50 символов. Попробуй ещё:"); sData.name = val; return wizardStep(tg, chatId, 2, sData); }
  if (state === "wiz_2_custom") { if (!/^#?[0-9A-Fa-f]{6}$/.test(val)) return tg.send(chatId, "❌ Введи HEX цвет, например: #FF5500"); sData.color = val.startsWith("#") ? val : `#${val}`; return wizardStep(tg, chatId, 3, sData); }
  if (state === "wiz_3") { if (val.length < 2 || val.length > 100) return tg.send(chatId, "❌ Заголовок: от 2 до 100 символов:"); sData.hero_title = val; return wizardStep(tg, chatId, 4, sData); }
  if (state === "wiz_4") { if (val.length < 2 || val.length > 300) return tg.send(chatId, "❌ Описание: от 2 до 300 символов:"); sData.hero_desc = val; return wizardStep(tg, chatId, 5, sData); }
  if (state === "wiz_5") { if (val.length < 2) return tg.send(chatId, "❌ Минимум 2 символа:"); sData.welcome = val; return wizardStep(tg, chatId, 6, sData); }
  if (state === "wiz_6") { sData.support = val; return wizardStep(tg, chatId, 7, sData); }
  if (state === "wiz_7") {
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(val)) return tg.send(chatId, "❌ Неверный формат токена. Скопируй токен из @BotFather:");
    await tg.send(chatId, "⏳ Проверяю токен..."); sData.bot_token = val; return showConfirmation(tg, chatId, sData);
  }
  // ─── Edit shop field ──────────────────────
  if (state === "edit_field") {
    const shopId = sData.shop_id as string; const field = sData.field as string;
    const fieldMap: Record<string, string> = { name: "name", slug: "slug", welcome: "welcome_message", support: "support_link", color: "color", hero_title: "hero_title", hero_desc: "hero_description" };
    const dbField = fieldMap[field]; if (!dbField) { await clearSession(chatId); return; }
    if (field === "color" && !/^#?[0-9A-Fa-f]{6}$/.test(val)) return tg.send(chatId, "❌ Введи HEX цвет, например: #FF5500");
    const updateVal = field === "color" ? (val.startsWith("#") ? val : `#${val}`) : val;
    await db().from("shops").update({ [dbField]: updateVal, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId); const resp = await tg.send(chatId, "✅ Обновлено!"); const mid = resp?.result?.message_id;
    if (mid) return shopSettings(tg, chatId, mid, shopId); return;
  }
  if (state === "set_bot_token") {
    const shopId = sData.shop_id as string;
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(val)) return tg.send(chatId, "❌ Неверный формат токена:");
    await tg.send(chatId, "⏳ Проверяю токен и устанавливаю webhook...");
    const result = await connectBotToken(val, shopId); await clearSession(chatId);
    return tg.send(chatId, result.message, ikb([[btn("◀️ К настройкам", `p:settings:${shopId}`)]]));
  }
  if (state === "set_cryptobot_token") {
    const shopId = sData.shop_id as string;
    if (val.length < 10) return tg.send(chatId, "❌ Неверный формат:");
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY"); if (!encKey) return tg.send(chatId, "❌ Ошибка конфигурации.");
    const { data: enc } = await db().rpc("encrypt_token", { p_token: val, p_key: encKey });
    await db().from("shops").update({ cryptobot_token_encrypted: enc, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId); return tg.send(chatId, "✅ CryptoBot-токен сохранён!", ikb([[btn("◀️ К настройкам", `p:settings:${shopId}`)]]));
  }
  if (state === "set_op_channel") {
    const shopId = sData.shop_id as string; const channelInput = val.trim();
    let channelId = channelInput; let channelLink = channelInput;
    if (channelInput.startsWith("https://t.me/")) { channelId = "@" + channelInput.replace("https://t.me/", "").split("/")[0]; channelLink = channelInput; }
    else if (channelInput.startsWith("@")) { channelId = channelInput; channelLink = `https://t.me/${channelInput.slice(1)}`; }
    else if (/^-?\d+$/.test(channelInput)) { channelId = channelInput; channelLink = ""; }
    else return tg.send(chatId, "❌ Введите @username канала, ссылку https://t.me/... или числовой ID:");
    await db().from("shops").update({ required_channel_id: channelId, required_channel_link: channelLink, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId); return tg.send(chatId, `✅ Канал установлен: ${esc(channelId)}`, ikb([[btn("◀️ Настройки ОП", `p:opsettings:${shopId}`)]]));
  }
}

// ═══════════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════════
async function handleCallback(tg: ReturnType<typeof TG>, chatId: number, msgId: number, data: string, cbId: string, from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  await tg.answer(cbId);
  const parts = data.split(":");
  const cmd = parts[1];
  let wizardSession: Awaited<ReturnType<typeof getSession>> = null;
  if (WIZARD_CALLBACK_COMMANDS.has(cmd)) {
    wizardSession = await getSession(chatId);
    const validWizardCallback = await validateWizardCallback(tg, chatId, msgId, cmd, parts, wizardSession);
    if (!validWizardCallback) return;
  }
  if (cmd === "checksub") {
    const ok = await checkAllChannels(tg, chatId);
    if (!ok) {
      const channels = await getChannelLinks(); const rows: Btn[][] = [];
      for (const ch of channels) rows.push([urlBtn(`📢 ${channels.length > 1 ? ch.id : "Подписаться на канал"}`, ch.link)]);
      rows.push([btn("✅ Проверить подписку", "p:checksub")]);
      return tg.edit(chatId, msgId, "❌ <b>Подписка не найдена</b>\n\nПодпишись на канал и нажми «Проверить подписку» снова.", ikb(rows));
    }
    await upsertUser(from); await clearSession(chatId); await tg.deleteMessage(chatId, msgId);
    return sendWelcome(tg, chatId, from.first_name || "друг");
  }
  if (cmd !== "noop" && (await hasChannelRequirement())) { const subscribed = await checkAllChannels(tg, chatId); if (!subscribed) { await showSubscribeGate(tg, chatId, from.first_name); return; } }
  if (cmd === "home") {
    await clearSession(chatId);
    const text = `👋 <b>${esc(from.first_name || "")}</b>, ты в главном меню\n\nВыбери действие:`;
    return tg.edit(chatId, msgId, text, ikb([[btn("🏪 Создать магазин", "p:create"), btn("📖 Как это работает", "p:howitworks")], [btn("👤 Мой профиль", "p:profile")], [btn("🏪 Мои магазины", "p:myshops:0")]]));
  }
  if (cmd === "noop") return;
  if (cmd === "howitworks") return howItWorks(tg, chatId, msgId);
  if (cmd === "profile") return showProfile(tg, chatId, msgId);
  if (cmd === "sub") return showSubscription(tg, chatId, msgId);
  if (cmd === "myshops") return myShops(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "shop") return shopView(tg, chatId, msgId, parts[2]);
  if (cmd === "settings") return shopSettings(tg, chatId, msgId, parts[2]);
  if (cmd === "stats") return shopStats(tg, chatId, msgId, parts[2]);
  if (cmd === "create") return wizardStep(tg, chatId, 1, {}, msgId);
  if (cmd === "wcancel") {
    await clearSession(chatId);
    return tg.edit(chatId, msgId, `👋 <b>${esc(from.first_name || "")}</b>, ты в главном меню\n\nВыбери действие:`, ikb([[btn("🏪 Создать магазин", "p:create"), btn("📖 Как это работает", "p:howitworks")], [btn("👤 Мой профиль", "p:profile")], [btn("🏪 Мои магазины", "p:myshops:0")]]));
  }
  if (cmd === "wcolor") {
    const session = wizardSession!; const sData = { ...(session.data || {}) } as Record<string, unknown>;
    const colorKey = parts[2];
    if (colorKey === "custom") { const res = await tg.edit(chatId, msgId, "🎨 Введи HEX цвет, например: <code>#FF5500</code>", ikb([[btn("◀️ Назад", "p:wback:2")]])); await persistWizardSession(chatId, "wiz_2_custom", sData, msgId); return res; }
    sData.color = COLORS[colorKey] || "#2B7FFF"; return wizardStep(tg, chatId, 3, sData, msgId);
  }
  if (cmd === "wback") { const session = wizardSession!; const sData = { ...(session.data || {}) } as Record<string, unknown>; return wizardStep(tg, chatId, parseInt(parts[2]) || 1, sData, msgId); }
  if (cmd === "confirm_create") { const session = wizardSession!; const sData = { ...(session.data || {}) } as Record<string, unknown>; return showLegalAgreement(tg, chatId, sData, msgId); }
  if (cmd === "accept_terms") return finalizeShop(tg, chatId, msgId);
  if (cmd === "copylink") {
    const shopId = parts[2]; const { data: shop } = await db().from("shops").select("id").eq("id", shopId).single();
    if (shop) { const url = `${WEBAPP_DOMAIN}/shop/${shop.id}`; await tg.send(chatId, `📋 Ссылка на магазин:\n\n<code>${esc(url)}</code>\n\nНажми на ссылку выше чтобы скопировать.`); }
    return;
  }
  if (cmd === "howaddprod") return howToAddProducts(tg, chatId, msgId, parts[2]);
  if (cmd === "edit") {
    const shopId = parts[2]; const field = parts[3];
    const labels: Record<string, string> = { name: "📛 название магазина", color: "🎨 HEX цвет (например #FF5500)", hero_title: "📌 заголовок витрины", hero_desc: "📝 описание витрины", welcome: "👋 приветственное сообщение", support: "🔗 ссылку на поддержку" };
    await setSession(chatId, "edit_field", { shop_id: shopId, field });
    return tg.edit(chatId, msgId, `✏️ Введи новое ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `p:settings:${shopId}`)]]));
  }
  if (cmd === "setbot") {
    const shopId = parts[2]; await setSession(chatId, "set_bot_token", { shop_id: shopId });
    return tg.edit(chatId, msgId, "🤖 <b>Подключение бота</b>\n\nОтправь токен своего бота от @BotFather:\n\n⚠️ Токен будет проверен через Telegram API, зашифрован и сохранён.\n✅ Webhook будет установлен автоматически.", ikb([[urlBtn("📖 Как получить токен", "https://core.telegram.org/bots/tutorial")], [btn("❌ Отмена", `p:settings:${shopId}`)]]));
  }
  if (cmd === "setcb") {
    const shopId = parts[2]; await setSession(chatId, "set_cryptobot_token", { shop_id: shopId });
    return tg.edit(chatId, msgId, "💰 <b>Подключение CryptoBot</b>\n\nОтправь API-токен от @CryptoBot:\n\n⚠️ Токен будет зашифрован.", ikb([[btn("❌ Отмена", `p:settings:${shopId}`)]]));
  }
  if (cmd === "opsettings") {
    const shopId = parts[2];
    const { data: s } = await db().from("shops").select("is_subscription_required, required_channel_link, required_channel_id").eq("id", shopId).single();
    const enabled = s?.is_subscription_required || false; const ch = s?.required_channel_id || "не указан"; const lnk = s?.required_channel_link || "—";
    const text = `📢 <b>Обязательная подписка (ОП)</b>\n\nСтатус: ${enabled ? "✅ Включена" : "❌ Выключена"}\nКанал: <b>${esc(ch)}</b>\nСсылка: ${lnk}\n\nКогда включена — пользователь должен подписаться на канал, чтобы получить доступ к магазину.`;
    return tg.edit(chatId, msgId, text, ikb([[btn(enabled ? "🔴 Выключить" : "🟢 Включить", `p:optoggle:${shopId}`)], [btn("📢 Указать канал", `p:opsetc:${shopId}`)], [btn("🧪 Тест подключения", `p:optest:${shopId}`)], [btn("◀️ К настройкам", `p:settings:${shopId}`)]]));
  }
  if (cmd === "optoggle") {
    const shopId = parts[2]; const { data: s } = await db().from("shops").select("is_subscription_required").eq("id", shopId).single();
    const newVal = !(s?.is_subscription_required); await db().from("shops").update({ is_subscription_required: newVal, updated_at: new Date().toISOString() }).eq("id", shopId);
    const { data: s2 } = await db().from("shops").select("is_subscription_required, required_channel_link, required_channel_id").eq("id", shopId).single();
    const enabled = s2?.is_subscription_required || false; const ch = s2?.required_channel_id || "не указан"; const lnk = s2?.required_channel_link || "—";
    return tg.edit(chatId, msgId, `📢 <b>Обязательная подписка (ОП)</b>\n\nСтатус: ${enabled ? "✅ Включена" : "❌ Выключена"}\nКанал: <b>${esc(ch)}</b>\nСсылка: ${lnk}`, ikb([[btn(enabled ? "🔴 Выключить" : "🟢 Включить", `p:optoggle:${shopId}`)], [btn("📢 Указать канал", `p:opsetc:${shopId}`)], [btn("🧪 Тест подключения", `p:optest:${shopId}`)], [btn("◀️ К настройкам", `p:settings:${shopId}`)]]));
  }
  if (cmd === "opsetc") {
    const shopId = parts[2]; await setSession(chatId, "set_op_channel", { shop_id: shopId });
    return tg.edit(chatId, msgId, `📢 <b>Укажите канал</b>\n\nОтправьте:\n• @username канала\n• Ссылку https://t.me/channel\n• Или числовой ID канала\n\n⚠️ Бот магазина должен быть добавлен в канал как администратор.`, ikb([[btn("❌ Отмена", `p:opsettings:${shopId}`)]]));
  }
  if (cmd === "optest") {
    const shopId = parts[2];
    const { data: s } = await db().from("shops").select("required_channel_id, bot_token_encrypted").eq("id", shopId).single();
    if (!s?.required_channel_id) return tg.edit(chatId, msgId, "❌ Канал не указан.", ikb([[btn("📢 Указать канал", `p:opsetc:${shopId}`)], [btn("◀️ Назад", `p:opsettings:${shopId}`)]]));
    if (!s?.bot_token_encrypted) return tg.edit(chatId, msgId, "❌ Бот не подключён.", ikb([[btn("◀️ Назад", `p:opsettings:${shopId}`)]]));
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY"); if (!encKey) return tg.edit(chatId, msgId, "❌ Ошибка конфигурации.", ikb([[btn("◀️ Назад", `p:opsettings:${shopId}`)]]));
    const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: s.bot_token_encrypted, p_key: encKey });
    if (!rawToken) return tg.edit(chatId, msgId, "❌ Ошибка расшифровки.", ikb([[btn("◀️ Назад", `p:opsettings:${shopId}`)]]));
    try {
      const testRes = await fetch(`https://api.telegram.org/bot${rawToken}/getChatMember`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: s.required_channel_id, user_id: chatId }) }).then(r => r.json());
      if (testRes.ok) return tg.edit(chatId, msgId, `✅ Бот имеет доступ к каналу <b>${esc(s.required_channel_id)}</b>\n\nВаш статус: <b>${testRes.result.status}</b>`, ikb([[btn("◀️ Назад", `p:opsettings:${shopId}`)]]));
      else return tg.edit(chatId, msgId, `❌ <b>Ошибка:</b> ${esc(testRes.description || "Нет доступа")}\n\n⚠️ Убедитесь что бот добавлен в канал как администратор.`, ikb([[btn("🔄 Повторить", `p:optest:${shopId}`), btn("◀️ Назад", `p:opsettings:${shopId}`)]]));
    } catch (e) { return tg.edit(chatId, msgId, `❌ Ошибка: ${(e as Error).message}`, ikb([[btn("◀️ Назад", `p:opsettings:${shopId}`)]])); }
  }
  if (cmd === "toggle") {
    const shopId = parts[2]; const { data: shop } = await db().from("shops").select("status").eq("id", shopId).single();
    if (shop) await db().from("shops").update({ status: shop.status === "active" ? "paused" : "active", updated_at: new Date().toISOString() }).eq("id", shopId);
    return shopView(tg, chatId, msgId, shopId);
  }
  if (cmd === "delshop") return deleteShopConfirm(tg, chatId, msgId, parts[2]);
  if (cmd === "confirmdelete") return deleteShopExecute(tg, chatId, msgId, parts[2]);
  if (cmd === "pay_sub") {
    const SUBSCRIPTION_PRICE = 9;
    const telegramId = chatId;
    const session = await getSession(chatId);
    const promoData = session?.state === "sub_promo_applied" ? session.data as Record<string, unknown> : null;
    let discountAmount = 0;
    let promoCode: string | null = null;
    let promoId: string | null = null;
    if (promoData) {
      promoCode = promoData.promo_code as string;
      promoId = promoData.promo_id as string;
      discountAmount = Number(promoData.discount_amount || 0);
    }
    const finalAmount = Math.max(0, SUBSCRIPTION_PRICE - discountAmount);
    const { data: user } = await db().from("platform_users").select("id").eq("telegram_id", telegramId).maybeSingle();
    if (!user) return tg.edit(chatId, msgId, "❌ Пользователь не найден.", ikb([[btn("◀️ Назад", "p:sub")]]));
    const { data: payment, error: payError } = await db().from("subscription_payments").insert({
      user_id: user.id, amount: SUBSCRIPTION_PRICE, promo_code: promoCode, discount_amount: discountAmount, final_amount: finalAmount,
      status: finalAmount === 0 ? "paid" : "pending",
    }).select("id").single();
    if (payError || !payment) return tg.edit(chatId, msgId, `❌ Ошибка: ${payError?.message || "unknown"}`, ikb([[btn("◀️ Назад", "p:sub")]]));
    if (promoId && promoCode) {
      await db().rpc("increment_platform_promo_usage", { p_promo_id: promoId, p_telegram_id: telegramId, p_payment_id: payment.id, p_discount_amount: discountAmount });
    }
    if (finalAmount === 0) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db().from("platform_users").update({ subscription_status: "active", subscription_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq("telegram_id", telegramId);
      await clearSession(chatId);
      return tg.edit(chatId, msgId, `✅ <b>Подписка активирована!</b>\n\n🎫 Промокод: <code>${esc(promoCode || "")}</code>\n💰 Скидка: $${discountAmount.toFixed(2)}\n\n✅ Подписка до ${new Date(expiresAt).toLocaleDateString("ru")}`, ikb([[btn("◀️ В меню", "p:home")]]));
    }
    const platformCBToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!platformCBToken) { await clearSession(chatId); return tg.edit(chatId, msgId, "❌ Платёжная система не настроена.", ikb([[btn("◀️ Назад", "p:sub")]])); }
    try {
      const botInfo = await fetch(`https://api.telegram.org/bot${Deno.env.get("PLATFORM_BOT_TOKEN")}/getMe`).then(r => r.json());
      const invoiceRes = await fetch("https://pay.crypt.bot/api/createInvoice", {
        method: "POST", headers: { "Content-Type": "application/json", "Crypto-Pay-API-Token": platformCBToken },
        body: JSON.stringify({
          currency_type: "fiat", fiat: "USD", amount: finalAmount.toFixed(2),
          description: `Подписка ${PLATFORM_NAME} (1 мес)${promoCode ? ` [промо: ${promoCode}]` : ""}`,
          payload: JSON.stringify({ type: "subscription", paymentId: payment.id, telegramUserId: telegramId }),
          paid_btn_name: "callback", paid_btn_url: `https://t.me/${botInfo.result?.username || "bot"}`,
        }),
      }).then(r => r.json());
      if (!invoiceRes.ok) { await clearSession(chatId); return tg.edit(chatId, msgId, `❌ Ошибка CryptoBot: ${invoiceRes.error?.name || "unknown"}`, ikb([[btn("◀️ Назад", "p:sub")]])); }
      const invoice = invoiceRes.result;
      await db().from("subscription_payments").update({ invoice_id: String(invoice.invoice_id), status: "awaiting" }).eq("id", payment.id);
      await clearSession(chatId);
      let text = `💳 <b>Оплата подписки</b>\n\n💰 Стоимость: $${SUBSCRIPTION_PRICE.toFixed(2)}`;
      if (discountAmount > 0) text += `\n🎫 Промокод: <code>${esc(promoCode || "")}</code>\n🏷 Скидка: -$${discountAmount.toFixed(2)}`;
      text += `\n💵 К оплате: <b>$${finalAmount.toFixed(2)}</b>\n\nНажмите кнопку ниже для оплаты:`;
      return tg.edit(chatId, msgId, text, ikb([[urlBtn("💳 Оплатить", invoice.pay_url)], [btn("◀️ Назад", "p:sub")]]));
    } catch (e) { await clearSession(chatId); return tg.edit(chatId, msgId, `❌ Ошибка: ${(e as Error).message}`, ikb([[btn("◀️ Назад", "p:sub")]])); }
  }
  if (cmd === "sub_promo") {
    await setSession(chatId, "sub_enter_promo", {});
    return tg.edit(chatId, msgId, `🎫 <b>Промокод на подписку</b>\n\nВведите промокод:`, ikb([[btn("❌ Отмена", "p:sub")]]));
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// ══════════════ SUPER-ADMIN PANEL /adm ════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Access Control ───────────────────────────
async function isSuperAdmin(telegramId: number): Promise<boolean> {
  // Check platform_admins table first
  const { data } = await db().from("platform_admins").select("id").eq("telegram_id", telegramId).maybeSingle();
  if (data) return true;
  // Fallback to env
  const raw = Deno.env.get("ADMIN_TELEGRAM_IDS") || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  return ids.includes(String(telegramId));
}

async function getAdminRole(telegramId: number): Promise<string> {
  const { data } = await db().from("platform_admins").select("role").eq("telegram_id", telegramId).maybeSingle();
  if (data) return data.role;
  const raw = Deno.env.get("ADMIN_TELEGRAM_IDS") || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (ids.includes(String(telegramId))) return "owner";
  return "none";
}

async function admLog(adminTgId: number, action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) {
  await db().from("admin_logs").insert({
    admin_telegram_id: adminTgId,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    details: details || {},
  });
}

// ─── Blocked User Check ──────────────────────
async function isUserBlocked(telegramId: number): Promise<boolean> {
  const { data } = await db().from("user_profiles").select("is_blocked").eq("telegram_id", telegramId).maybeSingle();
  return data?.is_blocked === true;
}

// ─── ADM Main Menu ────────────────────────────
async function admHome(tg: ReturnType<typeof TG>, chatId: number, msgId?: number) {
  const text = `🛡 <b>Super Admin Panel</b>\n\nВыберите раздел:`;
  const kb = ikb([
    [btn("📊 Статистика", "adm:stats"), btn("👥 Пользователи", "adm:users:0")],
    [btn("🏪 Магазины", "adm:shops:0"), btn("💳 Подписки/платежи", "adm:finance:sub:0")],
    [btn("🧾 Заказы", "adm:orders:all:0"), btn("🤖 Боты/webhook", "adm:bots:0")],
    [btn("🎟 Промокоды", "adm:promo:platform:0"), btn("⭐ Отзывы", "adm:reviews:shop:0")],
    [btn("🎫 Промо подписки", "adm:subpromo:0"), btn("📢 Рассылки", "adm:broadcast")],
    [btn("🚨 Риски/блокировки", "adm:risks"), btn("📋 Логи", "adm:logs:0")],
    [btn("⚙️ Настройки", "adm:settings"), btn("👮 Администраторы", "adm:admins")],
  ]);
  if (msgId) return tg.edit(chatId, msgId, text, kb);
  return tg.send(chatId, text, kb);
}

// ─── PLATFORM STATS DASHBOARD ────────────────
async function admStats(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const [
    { count: totalUsers },
    { count: totalShops },
    { count: activeShops },
    { count: pausedShops },
    { data: allShops },
    { count: connectedBots },
    { count: activeWebhooks },
    { count: opEnabled },
    { count: totalCustomers },
    { count: totalShopOrders },
    { data: paidOrders },
    { count: subPayments },
    { count: invoiceCount },
    { count: rateLimits },
    { count: blockedUsers },
    { count: pendingOrders },
    { count: brokenWebhooks },
    { count: noBotShops },
    { count: noCryptoShops },
  ] = await Promise.all([
    db().from("platform_users").select("id", { count: "exact", head: true }),
    db().from("shops").select("id", { count: "exact", head: true }),
    db().from("shops").select("id", { count: "exact", head: true }).eq("status", "active"),
    db().from("shops").select("id", { count: "exact", head: true }).eq("status", "paused"),
    db().from("shops").select("owner_id"),
    db().from("shops").select("id", { count: "exact", head: true }).not("bot_token_encrypted", "is", null),
    db().from("shops").select("id", { count: "exact", head: true }).eq("webhook_status", "active"),
    db().from("shops").select("id", { count: "exact", head: true }).eq("is_subscription_required", true),
    db().from("shop_customers").select("id", { count: "exact", head: true }),
    db().from("shop_orders").select("id", { count: "exact", head: true }),
    db().from("shop_orders").select("total_amount, shop_id").eq("payment_status", "paid"),
    db().from("subscription_payments").select("id", { count: "exact", head: true }),
    db().from("processed_invoices").select("invoice_id", { count: "exact", head: true }),
    db().from("rate_limits").select("id", { count: "exact", head: true }),
    db().from("user_profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true),
    // Problem indicators
    db().from("shop_orders").select("id", { count: "exact", head: true }).in("payment_status", ["unpaid", "awaiting"]),
    db().from("shops").select("id", { count: "exact", head: true }).not("bot_token_encrypted", "is", null).neq("webhook_status", "active"),
    db().from("shops").select("id", { count: "exact", head: true }).is("bot_token_encrypted", null).eq("status", "active"),
    db().from("shops").select("id", { count: "exact", head: true }).is("cryptobot_token_encrypted", null).eq("status", "active"),
  ]);

  const uniqueOwners = new Set(allShops?.map(s => s.owner_id) || []).size;
  const totalRevenue = paidOrders?.reduce((s, o) => s + Number(o.total_amount), 0) || 0;

  // Platform OP status
  const platformChannels = await getPlatformChannelIds();
  const platformOPStatus = platformChannels.length > 0 ? "✅" : "❌";

  // Top 5 shops by revenue
  const shopRevMap: Record<string, number> = {};
  for (const o of paidOrders || []) {
    shopRevMap[o.shop_id] = (shopRevMap[o.shop_id] || 0) + Number(o.total_amount);
  }
  const topShopIds = Object.entries(shopRevMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let topShopsText = "";
  if (topShopIds.length) {
    const { data: topShops } = await db().from("shops").select("id, name").in("id", topShopIds.map(s => s[0]));
    const nameMap: Record<string, string> = {};
    for (const s of topShops || []) nameMap[s.id] = s.name;
    for (let i = 0; i < topShopIds.length; i++) {
      topShopsText += `  ${i + 1}. ${esc(nameMap[topShopIds[i][0]] || "?")} — $${topShopIds[i][1].toFixed(2)}\n`;
    }
  } else {
    topShopsText = "  Нет данных\n";
  }

  // Problem indicators
  const problems: string[] = [];
  if ((brokenWebhooks || 0) > 0) problems.push(`⚠️ Broken webhook: ${brokenWebhooks}`);
  if ((noBotShops || 0) > 0) problems.push(`⚠️ Без бота: ${noBotShops}`);
  if ((noCryptoShops || 0) > 0) problems.push(`⚠️ Без CryptoBot: ${noCryptoShops}`);
  if ((pendingOrders || 0) > 0) problems.push(`⏳ Ожидают оплаты: ${pendingOrders}`);
  if ((blockedUsers || 0) > 0) problems.push(`🚫 Заблокированных: ${blockedUsers}`);
  const problemsText = problems.length ? problems.join("\n") : "✅ Нет проблем";

  const text =
    `📊 <b>Статистика платформы</b>\n\n` +
    `👥 Пользователей: <b>${totalUsers || 0}</b>\n` +
    `🏪 Магазинов: <b>${totalShops || 0}</b> (🟢 ${activeShops || 0} / 🔴 ${pausedShops || 0})\n` +
    `👤 Уникальных владельцев: <b>${uniqueOwners}</b>\n\n` +
    `🤖 Подключённых ботов: ${connectedBots || 0}\n` +
    `🔗 Активных webhook: ${activeWebhooks || 0}\n` +
    `📢 ОП магазинов: ${opEnabled || 0} | Платформа: ${platformOPStatus}\n\n` +
    `👥 Tenant клиентов: ${totalCustomers || 0}\n` +
    `🛍 Tenant заказов: ${totalShopOrders || 0}\n` +
    `💵 Tenant выручка: <b>$${totalRevenue.toFixed(2)}</b>\n\n` +
    `💳 Подписок: ${subPayments || 0}\n` +
    `🧾 Инвойсов: ${invoiceCount || 0}\n` +
    `⏱ Rate limits: ${rateLimits || 0}\n\n` +
    `🚨 <b>Проблемы:</b>\n${problemsText}\n\n` +
    `🏆 <b>Топ магазинов по выручке:</b>\n${topShopsText}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("🔄 Обновить", "adm:stats")],
    [btn("🚨 Риски", "adm:risks")],
    [btn("◀️ Меню", "adm:home")],
  ]));
}

// ─── USERS ────────────────────────────────────
async function admUsersList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, page: number) {
  const perPage = 5;
  const { count } = await db().from("platform_users").select("id", { count: "exact", head: true });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const { data: users } = await db().from("platform_users").select("*").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
  let text = `👥 <b>Пользователи</b> (${total})\n\n`;
  const rows: Btn[][] = [];
  if (users?.length) {
    for (const u of users) {
      const name = u.first_name + (u.last_name ? ` ${u.last_name}` : "");
      text += `• <b>${esc(name)}</b> ${u.username ? `@${u.username}` : ""} [${u.telegram_id}]\n`;
      rows.push([btn(`${esc(name)} [${u.telegram_id}]`, `adm:ucard:${u.telegram_id}`)]);
    }
  } else { text += "Нет пользователей.\n"; }
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:users:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:users:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("🔍 Поиск", "adm:usearch")]);
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function admUserCard(tg: ReturnType<typeof TG>, chatId: number, msgId: number, tgId: number) {
  const { data: pu } = await db().from("platform_users").select("*").eq("telegram_id", tgId).maybeSingle();
  if (!pu) return tg.edit(chatId, msgId, "❌ Пользователь не найден.", ikb([[btn("◀️ Назад", "adm:users:0")]]));
  const { data: up } = await db().from("user_profiles").select("*").eq("telegram_id", tgId).maybeSingle();
  const { count: shopCount } = await db().from("shops").select("id", { count: "exact", head: true }).eq("owner_id", pu.id);
  // Count orders across platform + all shops
  const { count: platformOrders } = await db().from("orders").select("id", { count: "exact", head: true }).eq("telegram_id", tgId);
  const { count: shopOrders } = await db().from("shop_orders").select("id", { count: "exact", head: true }).eq("buyer_telegram_id", tgId);
  const { data: shopRev } = await db().from("shop_orders").select("total_amount").eq("buyer_telegram_id", tgId).eq("payment_status", "paid");
  const { data: platRev } = await db().from("orders").select("total_amount").eq("telegram_id", tgId).eq("payment_status", "paid");
  const totalSpent = (shopRev?.reduce((s, o) => s + Number(o.total_amount), 0) || 0) + (platRev?.reduce((s, o) => s + Number(o.total_amount), 0) || 0);
  const { count: shopCustCount } = await db().from("shop_customers").select("id", { count: "exact", head: true }).eq("telegram_id", tgId);
  const subMap: Record<string, string> = { active: "✅ Активна", trial: "🆓 Пробный", expired: "❌ Истекла" };
  const blocked = up?.is_blocked ? "🚫 ЗАБЛОКИРОВАН" : "✅ Активен";
  const name = pu.first_name + (pu.last_name ? ` ${pu.last_name}` : "");
  const text =
    `👤 <b>${esc(name)}</b>\n\n` +
    `🆔 Telegram ID: <code>${tgId}</code>\n` +
    `👤 Username: ${pu.username ? `@${pu.username}` : "—"}\n` +
    `📅 Регистрация: ${new Date(pu.created_at).toLocaleDateString("ru")}\n` +
    `⭐ Premium: ${pu.is_premium ? "Да" : "Нет"}\n` +
    `📊 Подписка: ${subMap[pu.subscription_status] || pu.subscription_status}\n` +
    `🔒 Статус: ${blocked}\n` +
    (up ? `💰 Баланс: $${Number(up.balance || 0).toFixed(2)}\n` : "") +
    (up?.internal_note ? `📝 Заметка: ${esc(up.internal_note)}\n` : "") +
    `\n🏪 Магазинов: ${shopCount || 0}\n` +
    `🛍 Заказов: ${(platformOrders || 0) + (shopOrders || 0)}\n` +
    `💵 Потрачено: $${totalSpent.toFixed(2)}\n` +
    `🛒 Профилей покупателя: ${shopCustCount || 0}`;
  const rows: Btn[][] = [
    [btn("🏪 Магазины", `adm:ushops:${pu.id}:0`), btn("🧾 Заказы", `adm:uorders:${tgId}:0`)],
    [btn(up?.is_blocked ? "✅ Разблокировать" : "🚫 Заблокировать", `adm:ublock:${tgId}`)],
    [btn("💰 Баланс ±", `adm:ubal:${tgId}`), btn("📝 Заметка", `adm:unote:${tgId}`)],
    [btn("✉️ Сообщение", `adm:umsg:${tgId}`)],
    [btn("◀️ Назад", "adm:users:0")],
  ];
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── SHOPS ────────────────────────────────────
async function admShopsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, page: number) {
  const perPage = 5;
  const { count } = await db().from("shops").select("id", { count: "exact", head: true });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const { data: shops } = await db().from("shops").select("*").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
  let text = `🏪 <b>Все магазины</b> (${total})\n\n`;
  const rows: Btn[][] = [];
  if (shops?.length) {
    for (const s of shops) {
      const dot = s.status === "active" ? "🟢" : "🔴";
      const bot = s.bot_username ? `@${s.bot_username}` : "нет бота";
      text += `${dot} <b>${esc(s.name)}</b> — ${bot}\n`;
      rows.push([btn(`${dot} ${s.name}`, `adm:scard:${s.id}`)]);
    }
  } else { text += "Нет магазинов.\n"; }
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:shops:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:shops:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("🔍 Поиск", "adm:ssearch")]);
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function admShopCard(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return tg.edit(chatId, msgId, "❌ Магазин не найден.", ikb([[btn("◀️ Назад", "adm:shops:0")]]));
  // Get owner info
  const { data: owner } = await db().from("platform_users").select("telegram_id, first_name, username").eq("id", shop.owner_id).maybeSingle();
  // Stats
  const { count: prodCount } = await db().from("shop_products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: orderCount } = await db().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { data: rev } = await db().from("shop_orders").select("total_amount").eq("shop_id", shopId).eq("payment_status", "paid");
  const revenue = rev?.reduce((s, o) => s + Number(o.total_amount), 0) || 0;
  const { count: custCount } = await db().from("shop_customers").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: revCount } = await db().from("shop_reviews").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const statusEmoji = shop.status === "active" ? "🟢" : "🔴";
  const botStatus = shop.bot_username ? `@${shop.bot_username} (${shop.webhook_status})` : "не подключён";
  const crypto = shop.cryptobot_token_encrypted ? "✅" : "❌";
  const op = shop.is_subscription_required ? `✅ (${shop.required_channel_id || "канал не указан"})` : "❌";
  const ownerName = owner ? `${esc(owner.first_name)} ${owner.username ? `@${owner.username}` : ""} [${owner.telegram_id}]` : shop.owner_id;
  const text =
    `🏪 <b>${esc(shop.name)}</b> ${statusEmoji}\n\n` +
    `🔗 Slug: <code>${shop.slug}</code>\n` +
    `👤 Владелец: ${ownerName}\n` +
    `🎨 Цвет: ${shop.color}\n` +
    `🤖 Бот: ${botStatus}\n` +
    `💰 CryptoBot: ${crypto}\n` +
    `📢 ОП: ${op}\n` +
    `📅 Создан: ${new Date(shop.created_at).toLocaleDateString("ru")}\n\n` +
    `📊 <b>Статистика:</b>\n` +
    `📦 Товаров: ${prodCount || 0}\n` +
    `🛍 Заказов: ${orderCount || 0}\n` +
    `💵 Выручка: $${revenue.toFixed(2)}\n` +
    `👥 Клиентов: ${custCount || 0}\n` +
    `⭐ Отзывов: ${revCount || 0}`;
  const rows: Btn[][] = [
    [btn("👤 Владелец", `adm:ucard:${owner?.telegram_id || 0}`)],
    [btn("📦 Товары", `adm:sprods:${shopId}:0`), btn("🧾 Заказы", `adm:sorders:${shopId}:0`)],
    [btn("👥 Клиенты", `adm:scusts:${shopId}:0`), btn("🎟 Промо", `adm:spromo:${shopId}:0`)],
    [btn("⭐ Отзывы", `adm:srevs:${shopId}:0`), btn("📋 Логи", `adm:slogs:${shopId}:0`)],
    [btn(shop.status === "active" ? "⏸ Пауза" : "▶️ Активировать", `adm:stoggle:${shopId}`)],
    [btn("📢 Настройки ОП" + (shop.is_subscription_required ? " ✅" : ""), `adm:opsetc:${shopId}`)],
    [btn("🗑 Удалить", `adm:sdel:${shopId}`), btn("🔗 Storefront", `adm:slink:${shopId}`)],
    [btn("◀️ Назад", "adm:shops:0")],
  ];
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── ORDERS ───────────────────────────────────
async function admOrdersList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, mode: string, page: number) {
  const perPage = 5;
  let text = ""; let rows: Btn[][] = []; let total = 0;
  if (mode === "platform" || mode === "all") {
    const { count: pc } = await db().from("orders").select("id", { count: "exact", head: true });
    total += pc || 0;
  }
  if (mode === "shop" || mode === "all") {
    const { count: sc } = await db().from("shop_orders").select("id", { count: "exact", head: true });
    total += sc || 0;
  }
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);

  text = `🧾 <b>Заказы</b> [${mode === "all" ? "все" : mode === "platform" ? "платформа" : "магазины"}] (${total})\n\n`;
  // For simplicity, show platform orders first, then shop orders
  const items: { type: string; order_number: string; tgId: number; amount: number; status: string; created: string; id: string; shopName?: string }[] = [];

  if (mode === "platform" || mode === "all") {
    const { data: po } = await db().from("orders").select("*").order("created_at", { ascending: false }).range(0, 50);
    for (const o of po || []) items.push({ type: "P", order_number: o.order_number, tgId: o.telegram_id, amount: Number(o.total_amount), status: o.status, created: o.created_at, id: o.id });
  }
  if (mode === "shop" || mode === "all") {
    const { data: so } = await db().from("shop_orders").select("*, shops!inner(name)").order("created_at", { ascending: false }).range(0, 50);
    for (const o of so || []) items.push({ type: "S", order_number: o.order_number, tgId: o.buyer_telegram_id, amount: Number(o.total_amount), status: o.status, created: o.created_at, id: o.id, shopName: (o as any).shops?.name });
  }
  items.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  const slice = items.slice(p * perPage, (p + 1) * perPage);
  for (const o of slice) {
    const badge = o.type === "P" ? "🌐" : "🏪";
    text += `${badge} <code>${o.order_number}</code> — $${o.amount.toFixed(2)} [${o.status}]${o.shopName ? ` (${esc(o.shopName)})` : ""}\n`;
    rows.push([btn(`${badge} ${o.order_number}`, `adm:ocard:${o.type}:${o.id}`)]);
  }
  if (!slice.length) text += "Нет заказов.\n";

  // Mode toggles
  rows.push([
    btn(mode === "all" ? "• Все" : "Все", "adm:orders:all:0"),
    btn(mode === "platform" ? "• Платф." : "Платф.", "adm:orders:platform:0"),
    btn(mode === "shop" ? "• Магаз." : "Магаз.", "adm:orders:shop:0"),
  ]);
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:orders:${mode}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:orders:${mode}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("🔍 Поиск", "adm:osearch")]);
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function admOrderCard(tg: ReturnType<typeof TG>, chatId: number, msgId: number, type: string, orderId: string) {
  let text = "";
  const rows: Btn[][] = [];
  if (type === "P") {
    const { data: o } = await db().from("orders").select("*").eq("id", orderId).single();
    if (!o) return tg.edit(chatId, msgId, "❌ Заказ не найден.", ikb([[btn("◀️ Назад", "adm:orders:all:0")]]));
    const { data: items } = await db().from("order_items").select("*").eq("order_id", orderId);
    const itemLines = items?.map(i => `  • ${esc(i.product_title)} × ${i.quantity} — $${Number(i.product_price).toFixed(2)}`).join("\n") || "—";
    text = `🌐 <b>Заказ (платформа)</b>\n\n📋 Номер: <code>${o.order_number}</code>\n👤 TG ID: <code>${o.telegram_id}</code>\n💵 Сумма: $${Number(o.total_amount).toFixed(2)}\n🏷 Скидка: $${Number(o.discount_amount).toFixed(2)}\n💰 Баланс: $${Number(o.balance_used).toFixed(2)}\n🎟 Промо: ${o.promo_code || "—"}\n📊 Статус: ${o.status}\n💳 Оплата: ${o.payment_status}\n📅 Создан: ${new Date(o.created_at).toLocaleString("ru")}\n\n📦 <b>Состав:</b>\n${itemLines}`;
    rows.push([btn("👤 Клиент", `adm:ucard:${o.telegram_id}`)]);
    rows.push([btn("◀️ Назад", "adm:orders:all:0")]);
  } else {
    const { data: o } = await db().from("shop_orders").select("*, shops!inner(name)").eq("id", orderId).single();
    if (!o) return tg.edit(chatId, msgId, "❌ Заказ не найден.", ikb([[btn("◀️ Назад", "adm:orders:all:0")]]));
    const { data: items } = await db().from("shop_order_items").select("*").eq("order_id", orderId);
    const itemLines = items?.map(i => `  • ${esc(i.product_name)} × ${i.quantity} — $${Number(i.product_price).toFixed(2)}`).join("\n") || "—";
    text = `🏪 <b>Заказ (${esc((o as any).shops?.name || "")})</b>\n\n📋 Номер: <code>${o.order_number}</code>\n👤 TG ID: <code>${o.buyer_telegram_id}</code>\n💵 Сумма: $${Number(o.total_amount).toFixed(2)}\n🏷 Скидка: $${Number(o.discount_amount).toFixed(2)}\n💰 Баланс: $${Number(o.balance_used).toFixed(2)}\n🎟 Промо: ${o.promo_code || "—"}\n📊 Статус: ${o.status}\n💳 Оплата: ${o.payment_status}\n📅 Создан: ${new Date(o.created_at).toLocaleString("ru")}\n\n📦 <b>Состав:</b>\n${itemLines}`;
    rows.push([btn("👤 Клиент", `adm:ucard:${o.buyer_telegram_id}`), btn("🏪 Магазин", `adm:scard:${o.shop_id}`)]);
    rows.push([btn("◀️ Назад", "adm:orders:all:0")]);
  }
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── FINANCE ──────────────────────────────────
async function admFinance(tg: ReturnType<typeof TG>, chatId: number, msgId: number, tab: string, page: number) {
  const perPage = 5;
  let text = ""; const rows: Btn[][] = [];
  if (tab === "sub") {
    const { count } = await db().from("subscription_payments").select("id", { count: "exact", head: true });
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const { data: payments } = await db().from("subscription_payments").select("*").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
    text = `💳 <b>Подписки</b> (${total})\n\n`;
    for (const pay of payments || []) {
      text += `• $${Number(pay.amount).toFixed(2)} [${pay.status}] — ${new Date(pay.created_at).toLocaleDateString("ru")}\n`;
    }
    if (!payments?.length) text += "Нет платежей.\n";
    if (totalPages > 1) {
      const nav: Btn[] = [];
      if (p > 0) nav.push(btn("◀️", `adm:finance:sub:${p - 1}`));
      nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
      if (p < totalPages - 1) nav.push(btn("▶️", `adm:finance:sub:${p + 1}`));
      rows.push(nav);
    }
  } else {
    const { count } = await db().from("processed_invoices").select("invoice_id", { count: "exact", head: true });
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const { data: invoices } = await db().from("processed_invoices").select("*").order("processed_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
    text = `🧾 <b>Инвойсы</b> (${total})\n\n`;
    for (const inv of invoices || []) {
      text += `• <code>${inv.invoice_id}</code> [$${Number(inv.amount || 0).toFixed(2)}] ${inv.type} — ${new Date(inv.processed_at).toLocaleDateString("ru")}\n`;
    }
    if (!invoices?.length) text += "Нет инвойсов.\n";
    if (totalPages > 1) {
      const nav: Btn[] = [];
      if (p > 0) nav.push(btn("◀️", `adm:finance:inv:${p - 1}`));
      nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
      if (p < totalPages - 1) nav.push(btn("▶️", `adm:finance:inv:${p + 1}`));
      rows.push(nav);
    }
  }
  rows.push([btn(tab === "sub" ? "• Подписки" : "Подписки", "adm:finance:sub:0"), btn(tab === "inv" ? "• Инвойсы" : "Инвойсы", "adm:finance:inv:0")]);
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── BOTS ─────────────────────────────────────
async function admBotsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, page: number) {
  const perPage = 5;
  const { count } = await db().from("shops").select("id", { count: "exact", head: true });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const { data: shops } = await db().from("shops").select("id, name, bot_username, bot_id, webhook_status, bot_validated_at, is_subscription_required, required_channel_id").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
  let text = `🤖 <b>Боты и Webhook</b> (${total})\n\n`;
  const rows: Btn[][] = [];
  for (const s of shops || []) {
    const wh = s.webhook_status === "active" ? "✅" : s.webhook_status === "failed" ? "❌" : "⚪";
    const botName = s.bot_username ? `@${s.bot_username}` : "—";
    const op = s.is_subscription_required ? "📢" : "";
    text += `${wh} <b>${esc(s.name)}</b> — ${botName} ${op}\n`;
    rows.push([btn(`${wh} ${s.name}`, `adm:bcard:${s.id}`)]);
  }
  if (!shops?.length) text += "Нет магазинов.\n";
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:bots:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:bots:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function admBotCard(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: s } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!s) return tg.edit(chatId, msgId, "❌ Не найден.", ikb([[btn("◀️ Назад", "adm:bots:0")]]));
  const text =
    `🤖 <b>Бот: ${esc(s.name)}</b>\n\n` +
    `Bot: ${s.bot_username ? `@${s.bot_username}` : "не подключён"}\n` +
    `Bot ID: ${s.bot_id || "—"}\n` +
    `Webhook: ${s.webhook_status}\n` +
    `Валидирован: ${s.bot_validated_at ? new Date(s.bot_validated_at).toLocaleString("ru") : "—"}\n` +
    `ОП: ${s.is_subscription_required ? "✅" : "❌"}\n` +
    `Канал: ${s.required_channel_id || "—"}`;
  const rows: Btn[][] = [];
  if (s.bot_token_encrypted) {
    rows.push([btn("🔄 Revalidate", `adm:brevalidate:${shopId}`), btn("🔗 Reset WH", `adm:breset:${shopId}`)]);
    rows.push([btn("🗑 Remove WH", `adm:bremove:${shopId}`)]);
    if (s.is_subscription_required && s.required_channel_id) rows.push([btn("🧪 Test ОП", `adm:boptest:${shopId}`)]);
  }
  rows.push([btn("◀️ Назад", "adm:bots:0")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── PROMOCODES ───────────────────────────────
async function admPromoList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, mode: string, page: number) {
  const perPage = 5;
  let text = ""; const rows: Btn[][] = [];
  if (mode === "platform") {
    const { count } = await db().from("promocodes").select("id", { count: "exact", head: true });
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const { data: promos } = await db().from("promocodes").select("*").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
    text = `🎟 <b>Промокоды (платформа)</b> (${total})\n\n`;
    for (const pr of promos || []) {
      const active = pr.is_active ? "✅" : "❌";
      text += `${active} <code>${pr.code}</code> — ${pr.discount_type === "percent" ? `${pr.discount_value}%` : `$${pr.discount_value}`} (${pr.used_count}/${pr.max_uses || "∞"})\n`;
    }
    if (!promos?.length) text += "Нет промокодов.\n";
    if (totalPages > 1) {
      const nav: Btn[] = [];
      if (p > 0) nav.push(btn("◀️", `adm:promo:platform:${p - 1}`));
      nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
      if (p < totalPages - 1) nav.push(btn("▶️", `adm:promo:platform:${p + 1}`));
      rows.push(nav);
    }
  } else {
    const { count } = await db().from("shop_promocodes").select("id", { count: "exact", head: true });
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const { data: promos } = await db().from("shop_promocodes").select("*, shops!inner(name)").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
    text = `🎟 <b>Промокоды (магазины)</b> (${total})\n\n`;
    for (const pr of promos || []) {
      const active = pr.is_active ? "✅" : "❌";
      text += `${active} <code>${pr.code}</code> — ${pr.discount_type === "percent" ? `${pr.discount_value}%` : `$${pr.discount_value}`} [${esc((pr as any).shops?.name || "")}]\n`;
    }
    if (!promos?.length) text += "Нет промокодов.\n";
    if (totalPages > 1) {
      const nav: Btn[] = [];
      if (p > 0) nav.push(btn("◀️", `adm:promo:shop:${p - 1}`));
      nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
      if (p < totalPages - 1) nav.push(btn("▶️", `adm:promo:shop:${p + 1}`));
      rows.push(nav);
    }
  }
  rows.push([btn(mode === "platform" ? "• Платформа" : "Платформа", "adm:promo:platform:0"), btn(mode === "shop" ? "• Магазины" : "Магазины", "adm:promo:shop:0")]);
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── REVIEWS ──────────────────────────────────
async function admReviewsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, mode: string, page: number) {
  const perPage = 5;
  let text = ""; const rows: Btn[][] = [];
  const items: { id: string; author: string; rating: number; text: string; status: string; type: string; shopName?: string }[] = [];
  if (mode === "platform" || mode === "all") {
    const { data: reviews } = await db().from("reviews").select("*").order("created_at", { ascending: false }).limit(50);
    for (const r of reviews || []) items.push({ id: r.id, author: r.author, rating: r.rating, text: r.text, status: r.moderation_status, type: "P" });
  }
  if (mode === "shop" || mode === "all") {
    const { data: reviews } = await db().from("shop_reviews").select("*, shops!inner(name)").order("created_at", { ascending: false }).limit(50);
    for (const r of reviews || []) items.push({ id: r.id, author: r.author, rating: r.rating, text: r.text, status: r.moderation_status, type: "S", shopName: (r as any).shops?.name });
  }
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const slice = items.slice(p * perPage, (p + 1) * perPage);
  text = `⭐ <b>Отзывы</b> [${mode === "all" ? "все" : mode === "platform" ? "платформа" : "магазины"}] (${items.length})\n\n`;
  for (const r of slice) {
    const stars = "⭐".repeat(r.rating);
    const badge = r.type === "P" ? "🌐" : "🏪";
    const statusMap: Record<string, string> = { pending: "⏳", approved: "✅", rejected: "❌" };
    text += `${badge} ${statusMap[r.status] || r.status} ${stars} <b>${esc(r.author)}</b>${r.shopName ? ` (${esc(r.shopName)})` : ""}\n${esc(r.text.slice(0, 60))}${r.text.length > 60 ? "…" : ""}\n\n`;
    rows.push([
      btn("✅", `adm:rapprove:${r.type}:${r.id}`),
      btn("❌", `adm:rreject:${r.type}:${r.id}`),
      btn("🗑", `adm:rdelete:${r.type}:${r.id}`),
    ]);
  }
  if (!slice.length) text += "Нет отзывов.\n";
  rows.push([
    btn(mode === "all" ? "• Все" : "Все", "adm:reviews:all:0"),
    btn(mode === "platform" ? "• Платф." : "Платф.", "adm:reviews:platform:0"),
    btn(mode === "shop" ? "• Магаз." : "Магаз.", "adm:reviews:shop:0"),
  ]);
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:reviews:${mode}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:reviews:${mode}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── BROADCAST ────────────────────────────────
async function admBroadcastMenu(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const { count: allUsers } = await db().from("platform_users").select("id", { count: "exact", head: true });
  // Count unique shop owners, not shops
  const { data: ownerData } = await db().from("shops").select("owner_id");
  const uniqueOwners = new Set(ownerData?.map(s => s.owner_id) || []).size;
  const text = `📢 <b>Рассылки</b>\n\n👥 Всего пользователей: ${allUsers || 0}\n🏪 Владельцев магазинов: ${uniqueOwners}\n\nВыберите аудиторию:`;
  return tg.edit(chatId, msgId, text, ikb([
    [btn("👥 Всем пользователям", "adm:bcast:all")],
    [btn("🏪 Владельцам магазинов", "adm:bcast:owners")],
    [btn("◀️ Меню", "adm:home")],
  ]));
}

// ─── RISKS ────────────────────────────────────
async function admRisks(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const { count: rlCount } = await db().from("rate_limits").select("id", { count: "exact", head: true });
  const { count: blockedCount } = await db().from("user_profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true);
  const { count: brokenWh } = await db().from("shops").select("id", { count: "exact", head: true }).neq("webhook_status", "active").not("bot_token_encrypted", "is", null);
  const text = `🚨 <b>Риски и блокировки</b>\n\n⏱ Rate limits: ${rlCount || 0}\n🚫 Заблокированных: ${blockedCount || 0}\n⚠️ Broken webhook: ${brokenWh || 0}`;
  return tg.edit(chatId, msgId, text, ikb([
    [btn("🗑 Очистить rate limits", "adm:riskclear")],
    [btn("🚫 Заблокированные", "adm:riskblocked:0")],
    [btn("⚠️ Broken bots", "adm:riskbots:0")],
    [btn("◀️ Меню", "adm:home")],
  ]));
}

// ─── LOGS ─────────────────────────────────────
async function admLogsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, page: number) {
  const perPage = 10;
  const { count } = await db().from("admin_logs").select("id", { count: "exact", head: true });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const { data: logs } = await db().from("admin_logs").select("*").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
  let text = `📋 <b>Логи</b> (${total})\n\n`;
  for (const l of logs || []) {
    const date = new Date(l.created_at).toLocaleString("ru");
    text += `<code>${date}</code>\n👤 ${l.admin_telegram_id} → <b>${esc(l.action)}</b>${l.entity_type ? ` [${l.entity_type}]` : ""}${l.entity_id ? ` #${l.entity_id.slice(0, 8)}` : ""}\n\n`;
  }
  if (!logs?.length) text += "Нет логов.\n";
  const rows: Btn[][] = [];
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:logs:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:logs:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── SETTINGS ─────────────────────────────────
async function admSettings(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const { data: settings } = await db().from("shop_settings").select("*").order("key");
  // Filter out platform-managed keys from general settings display
  const platformKeys = ["platform_channel_id", "platform_channel_link", "platform_op_enabled", "platform_welcome_text", "platform_welcome_media_type", "platform_welcome_media_url"];
  const generalSettings = (settings || []).filter(s => !platformKeys.includes(s.key));
  let settingsText = "";
  for (const s of generalSettings) settingsText += `• <code>${esc(s.key)}</code> = ${esc(s.value.slice(0, 50))}\n`;
  if (!settingsText) settingsText = "Нет настроек.\n";

  // Platform OP info from DB (with ENV fallback)
  const channels = await getPlatformChannelIds();
  const channelLink = await getPlatformChannelLink();
  const opEnabledSetting = (settings || []).find(s => s.key === "platform_op_enabled");
  const opEnabled = opEnabledSetting ? opEnabledSetting.value === "true" : channels.length > 0;
  const { count: opShops } = await db().from("shops").select("id", { count: "exact", head: true }).eq("is_subscription_required", true);

  let opText = `📢 <b>ОП платформы (обязательная подписка):</b>\n`;
  opText += `Статус: ${opEnabled && channels.length > 0 ? "✅ Включена" : "❌ Выключена"}\n`;
  opText += `ID каналов: ${channels.length ? `<code>${esc(channels.join(", "))}</code>` : "— не задан"}\n`;
  opText += `Ссылка: ${channelLink ? esc(channelLink) : "— авто"}\n`;
  opText += `Магазинов с ОП: ${opShops || 0}\n`;

  const text =
    `⚙️ <b>Системные настройки</b>\n\n` +
    `🏷 Платформа: <b>${PLATFORM_NAME}</b>\n` +
    `🌐 WEBAPP: <code>${WEBAPP_DOMAIN}</code>\n` +
    `🔗 Поддержка: ${SUPPORT_LINK}\n\n` +
    `${opText}\n` +
    `📝 <b>shop_settings:</b>\n${settingsText}`;
  return tg.edit(chatId, msgId, text, ikb([
    [btn("👋 Приветствие", "adm:welcmgr"), btn("📢 Настройки ОП", "adm:platop")],
    [btn("✏️ Изменить setting", "adm:setedit")],
    [btn("◀️ Меню", "adm:home")],
  ]));
}

// ─── SUBSCRIPTION PROMOS (platform-level) ─────
async function admSubPromoList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, page: number) {
  const perPage = 5;
  const { count } = await db().from("platform_subscription_promos").select("id", { count: "exact", head: true });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const { data: promos } = await db().from("platform_subscription_promos").select("*").order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
  let text = `🎫 <b>Промокоды подписки</b> (${total})\n\n`;
  const rows: Btn[][] = [];
  for (const pr of promos || []) {
    const active = pr.is_active ? "✅" : "❌";
    const discountLabel = pr.discount_type === "percent" ? `${pr.discount_value}%` : `$${pr.discount_value}`;
    text += `${active} <code>${pr.code}</code> — ${discountLabel} (${pr.used_count}/${pr.max_uses || "∞"})${pr.note ? ` 📝` : ""}\n`;
    rows.push([btn(`${active} ${pr.code}`, `adm:spcard:${pr.id}`)]);
  }
  if (!promos?.length) text += "Нет промокодов.\n";
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:subpromo:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:subpromo:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("➕ Создать", "adm:spcreate")]);
  rows.push([btn("◀️ Меню", "adm:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function admSubPromoCard(tg: ReturnType<typeof TG>, chatId: number, msgId: number, promoId: string) {
  const { data: pr } = await db().from("platform_subscription_promos").select("*").eq("id", promoId).single();
  if (!pr) return tg.edit(chatId, msgId, "❌ Не найден.", ikb([[btn("◀️ Назад", "adm:subpromo:0")]]));
  const discountLabel = pr.discount_type === "percent" ? `${pr.discount_value}%` : `$${Number(pr.discount_value).toFixed(2)}`;
  const { count: usageCount } = await db().from("platform_promo_usages").select("id", { count: "exact", head: true }).eq("promo_id", promoId);
  const text =
    `🎫 <b>Промокод: ${esc(pr.code)}</b>\n\n` +
    `Статус: ${pr.is_active ? "✅ Активен" : "❌ Неактивен"}\n` +
    `Скидка: <b>${discountLabel}</b> (${pr.discount_type})\n` +
    `Лимит: ${pr.max_uses || "∞"} (использовано: ${pr.used_count})\n` +
    `На пользователя: ${pr.max_uses_per_user || "∞"}\n` +
    `Действует: ${pr.valid_from ? new Date(pr.valid_from).toLocaleDateString("ru") : "—"} → ${pr.valid_until ? new Date(pr.valid_until).toLocaleDateString("ru") : "—"}\n` +
    `Создал: <code>${pr.created_by}</code>\n` +
    `Всего использований: ${usageCount || 0}\n` +
    (pr.note ? `\n📝 <i>${esc(pr.note)}</i>\n` : "") +
    `\nСоздан: ${new Date(pr.created_at).toLocaleString("ru")}`;
  return tg.edit(chatId, msgId, text, ikb([
    [btn(pr.is_active ? "❌ Деактивировать" : "✅ Активировать", `adm:sptoggle:${promoId}`)],
    [btn("📊 Использования", `adm:spusage:${promoId}:0`)],
    [btn("✏️ Заметка", `adm:spnote:${promoId}`), btn("🗑 Удалить", `adm:spdelete:${promoId}`)],
    [btn("◀️ Назад", "adm:subpromo:0")],
  ]));
}

async function admSubPromoUsages(tg: ReturnType<typeof TG>, chatId: number, msgId: number, promoId: string, page: number) {
  const perPage = 10;
  const { count } = await db().from("platform_promo_usages").select("id", { count: "exact", head: true }).eq("promo_id", promoId);
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const { data: usages } = await db().from("platform_promo_usages").select("*").eq("promo_id", promoId).order("created_at", { ascending: false }).range(p * perPage, (p + 1) * perPage - 1);
  let text = `📊 <b>Использования промокода</b> (${total})\n\n`;
  for (const u of usages || []) {
    text += `• TG <code>${u.telegram_id}</code> — скидка $${Number(u.discount_amount).toFixed(2)} — ${new Date(u.created_at).toLocaleString("ru")}\n`;
  }
  if (!usages?.length) text += "Нет использований.\n";
  const rows: Btn[][] = [];
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `adm:spusage:${promoId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "adm:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `adm:spusage:${promoId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ К промокоду", `adm:spcard:${promoId}`)]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ─── ADMINS ───────────────────────────────────
async function admAdminsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const { data: admins } = await db().from("platform_admins").select("*").order("created_at");
  const envIds = (Deno.env.get("ADMIN_TELEGRAM_IDS") || "").split(",").map(s => s.trim()).filter(Boolean);
  let text = `👮 <b>Администраторы</b>\n\n`;
  if (admins?.length) {
    text += "<b>Из таблицы:</b>\n";
    for (const a of admins) text += `• <code>${a.telegram_id}</code> — ${a.role}\n`;
  }
  if (envIds.length) {
    text += `\n<b>Из ENV (owner):</b>\n`;
    for (const id of envIds) text += `• <code>${id}</code>\n`;
  }
  return tg.edit(chatId, msgId, text, ikb([
    [btn("➕ Добавить админа", "adm:addadmin")],
    [btn("◀️ Меню", "adm:home")],
  ]));
}

// ═══════════════════════════════════════════════
// ADM CALLBACK HANDLER
// ═══════════════════════════════════════════════
async function handleAdmCallback(tg: ReturnType<typeof TG>, chatId: number, msgId: number, data: string, cbId: string, adminTgId: number) {
  await tg.answer(cbId);
  // Verify access
  if (!(await isSuperAdmin(adminTgId))) return;

  const parts = data.split(":");
  const cmd = parts[1];

  if (cmd === "home") return admHome(tg, chatId, msgId);
  if (cmd === "noop") return;
  if (cmd === "stats") return admStats(tg, chatId, msgId);

  // ─── Users ────────────────────────────────
  if (cmd === "users") return admUsersList(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "ucard") return admUserCard(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "usearch") { await setSession(chatId, "adm_search_user", {}); return tg.edit(chatId, msgId, "🔍 Введите Telegram ID, @username или имя для поиска:", ikb([[btn("❌ Отмена", "adm:users:0")]])); }
  if (cmd === "ublock") {
    const tgId = parseInt(parts[2]);
    const { data: up } = await db().from("user_profiles").select("is_blocked").eq("telegram_id", tgId).maybeSingle();
    const newBlocked = !(up?.is_blocked);
    if (up) {
      await db().from("user_profiles").update({ is_blocked: newBlocked, updated_at: new Date().toISOString() }).eq("telegram_id", tgId);
    } else {
      // Create profile row if it doesn't exist (platform user without legacy profile)
      await db().from("user_profiles").insert({ telegram_id: tgId, is_blocked: newBlocked });
    }
    await admLog(adminTgId, newBlocked ? "block_user" : "unblock_user", "user", String(tgId));
    return admUserCard(tg, chatId, msgId, tgId);
  }
  if (cmd === "ubal") { await setSession(chatId, "adm_user_balance", { target_tg_id: parseInt(parts[2]) }); return tg.edit(chatId, msgId, "💰 Введите сумму (+ для начисления, - для списания):\n\nНапример: <code>+10</code> или <code>-5</code>", ikb([[btn("❌ Отмена", `adm:ucard:${parts[2]}`)]])); }
  if (cmd === "unote") { await setSession(chatId, "adm_user_note", { target_tg_id: parseInt(parts[2]) }); return tg.edit(chatId, msgId, "📝 Введите заметку:", ikb([[btn("❌ Отмена", `adm:ucard:${parts[2]}`)]])); }
  if (cmd === "umsg") { await setSession(chatId, "adm_user_msg", { target_tg_id: parseInt(parts[2]) }); return tg.edit(chatId, msgId, "✉️ Введите сообщение для отправки пользователю:", ikb([[btn("❌ Отмена", `adm:ucard:${parts[2]}`)]])); }
  if (cmd === "ushops") {
    const userId = parts[2]; const page = parseInt(parts[3]) || 0;
    const { data: shops } = await db().from("shops").select("*").eq("owner_id", userId).order("created_at");
    if (!shops?.length) return tg.edit(chatId, msgId, "🏪 Нет магазинов у пользователя.", ikb([[btn("◀️ Назад", `adm:ucard:${(await db().from("platform_users").select("telegram_id").eq("id", userId).maybeSingle()).data?.telegram_id || 0}`)]]));
    let text = `🏪 <b>Магазины пользователя</b> (${shops.length})\n\n`;
    const rows: Btn[][] = [];
    for (const s of shops) {
      const dot = s.status === "active" ? "🟢" : "🔴";
      text += `${dot} ${esc(s.name)}\n`;
      rows.push([btn(`${dot} ${s.name}`, `adm:scard:${s.id}`)]);
    }
    // Back to user card, not user list
    const { data: ownerUser } = await db().from("platform_users").select("telegram_id").eq("id", userId).maybeSingle();
    rows.push([btn("◀️ К пользователю", `adm:ucard:${ownerUser?.telegram_id || 0}`)]);
    return tg.edit(chatId, msgId, text, ikb(rows));
  }
  if (cmd === "uorders") {
    const tgId = parseInt(parts[2]); const page = parseInt(parts[3]) || 0;
    const { data: orders } = await db().from("orders").select("*").eq("telegram_id", tgId).order("created_at", { ascending: false }).limit(20);
    const { data: sOrders } = await db().from("shop_orders").select("*, shops!inner(name)").eq("buyer_telegram_id", tgId).order("created_at", { ascending: false }).limit(20);
    let text = `🧾 <b>Заказы [${tgId}]</b>\n\n`;
    const rows: Btn[][] = [];
    for (const o of orders || []) { text += `🌐 <code>${o.order_number}</code> — $${Number(o.total_amount).toFixed(2)} [${o.status}]\n`; rows.push([btn(`🌐 ${o.order_number}`, `adm:ocard:P:${o.id}`)]); }
    for (const o of sOrders || []) { text += `🏪 <code>${o.order_number}</code> — $${Number(o.total_amount).toFixed(2)} [${o.status}] (${esc((o as any).shops?.name || "")})\n`; rows.push([btn(`🏪 ${o.order_number}`, `adm:ocard:S:${o.id}`)]); }
    if (!orders?.length && !sOrders?.length) text += "Нет заказов.\n";
    rows.push([btn("◀️ Назад", `adm:ucard:${tgId}`)]);
    return tg.edit(chatId, msgId, text, ikb(rows));
  }

  // ─── Shops ────────────────────────────────
  if (cmd === "shops") return admShopsList(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "scard") return admShopCard(tg, chatId, msgId, parts[2]);
  if (cmd === "ssearch") { await setSession(chatId, "adm_search_shop", {}); return tg.edit(chatId, msgId, "🔍 Введите название, slug, TG ID владельца или @bot_username:", ikb([[btn("❌ Отмена", "adm:shops:0")]])); }
  if (cmd === "stoggle") {
    const shopId = parts[2];
    // Ask for comment before toggling
    const { data: s } = await db().from("shops").select("status, name").eq("id", shopId).single();
    if (!s) return;
    const newStatus = s.status === "active" ? "paused" : "active";
    const actionLabel = newStatus === "paused" ? "приостановить" : "активировать";
    await setSession(chatId, "adm_toggle_comment", { shopId, newStatus, shopName: s.name });
    return tg.edit(chatId, msgId, `📝 Укажите причину, чтобы <b>${actionLabel}</b> магазин «${esc(s.name)}»:\n\n(или отправьте <code>-</code> без комментария)`, ikb([[btn("❌ Отмена", `adm:scard:${shopId}`)]]));
  }
  if (cmd === "sdel") {
    const shopId = parts[2];
    const { data: s } = await db().from("shops").select("name").eq("id", shopId).single();
    await setSession(chatId, "adm_delete_comment", { shopId, shopName: s?.name || "" });
    return tg.edit(chatId, msgId, `🗑 <b>Удалить магазин</b> «${esc(s?.name || "")}»?\n\n⚠️ Это необратимо!\n\n📝 Укажите причину удаления:`, ikb([[btn("❌ Отмена", `adm:scard:${shopId}`)]]));
  }
  // OP toggle
  if (cmd === "optoggle") {
    const shopId = parts[2];
    const { data: s } = await db().from("shops").select("is_subscription_required, name").eq("id", shopId).single();
    if (!s) return;
    const newVal = !s.is_subscription_required;
    await db().from("shops").update({ is_subscription_required: newVal, updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(adminTgId, newVal ? "enable_op" : "disable_op", "shop", shopId);
    // Re-render OP settings screen
    const { data: updated } = await db().from("shops").select("required_channel_id, required_channel_link, is_subscription_required, name").eq("id", shopId).single();
    const chId = updated?.required_channel_id || "—";
    const chLink = updated?.required_channel_link || "—";
    const opStatus = updated?.is_subscription_required ? "✅ Включена" : "❌ Выключена";
    const text = `📢 <b>Настройки ОП</b>\n🏪 ${esc(updated?.name || "")}\n\n` +
      `Статус: ${opStatus}\n` +
      `ID канала: <code>${esc(chId)}</code>\n` +
      `Ссылка: ${chLink === "—" ? "—" : esc(chLink)}`;
    return tg.edit(chatId, msgId, text, ikb([
      [btn(updated?.is_subscription_required ? "❌ Выкл ОП" : "✅ Вкл ОП", `adm:optoggle:${shopId}`)],
      [btn("✏️ ID канала", `adm:opsetid:${shopId}`), btn("🔗 Ссылка", `adm:opsetlink:${shopId}`)],
      [btn("🗑 Очистить всё", `adm:opclear:${shopId}`)],
      [btn("◀️ К магазину", `adm:scard:${shopId}`)],
    ]));
  }
  if (cmd === "opsetc") {
    const shopId = parts[2];
    const { data: s } = await db().from("shops").select("required_channel_id, required_channel_link, is_subscription_required, name").eq("id", shopId).single();
    const chId = s?.required_channel_id || "—";
    const chLink = s?.required_channel_link || "—";
    const opStatus = s?.is_subscription_required ? "✅ Включена" : "❌ Выключена";
    const text = `📢 <b>Настройки ОП</b>\n🏪 ${esc(s?.name || "")}\n\n` +
      `Статус: ${opStatus}\n` +
      `ID канала: <code>${esc(chId)}</code>\n` +
      `Ссылка: ${chLink === "—" ? "—" : esc(chLink)}`;
    return tg.edit(chatId, msgId, text, ikb([
      [btn(s?.is_subscription_required ? "❌ Выкл ОП" : "✅ Вкл ОП", `adm:optoggle:${shopId}`)],
      [btn("✏️ ID канала", `adm:opsetid:${shopId}`), btn("🔗 Ссылка", `adm:opsetlink:${shopId}`)],
      [btn("🗑 Очистить всё", `adm:opclear:${shopId}`)],
      [btn("◀️ К магазину", `adm:scard:${shopId}`)],
    ]));
  }
  if (cmd === "opsetid") {
    const shopId = parts[2];
    await setSession(chatId, "adm_op_set_id", { shopId });
    return tg.edit(chatId, msgId, `📢 Введите ID канала:\n\n<code>@channel_name</code> или <code>-100xxxxxxxxxx</code>`, ikb([[btn("❌ Отмена", `adm:opsetc:${shopId}`)]]));
  }
  if (cmd === "opsetlink") {
    const shopId = parts[2];
    await setSession(chatId, "adm_op_set_link", { shopId });
    return tg.edit(chatId, msgId, `🔗 Введите ссылку на канал:\n\n<code>https://t.me/channel_name</code>`, ikb([[btn("❌ Отмена", `adm:opsetc:${shopId}`)]]));
  }
  if (cmd === "opclear") {
    const shopId = parts[2];
    await db().from("shops").update({ required_channel_id: null, required_channel_link: null, updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(adminTgId, "clear_op_channel", "shop", shopId);
    return admShopCard(tg, chatId, msgId, shopId);
  }
  if (cmd === "slink") {
    const shopId = parts[2];
    const url = `${WEBAPP_DOMAIN}/shop/${shopId}`;
    await tg.send(chatId, `🔗 Storefront:\n\n<code>${esc(url)}</code>`);
    return;
  }
  // Shop sub-sections
  if (cmd === "sprods") {
    const shopId = parts[2]; const page = parseInt(parts[3]) || 0;
    const { data: prods } = await db().from("shop_products").select("*").eq("shop_id", shopId).order("sort_order").limit(20);
    let text = `📦 <b>Товары магазина</b> (${prods?.length || 0})\n\n`;
    for (const p of prods || []) text += `${p.is_active ? "✅" : "❌"} ${esc(p.name)} — $${Number(p.price).toFixed(2)} (stock: ${p.stock})\n`;
    if (!prods?.length) text += "Нет товаров.\n";
    return tg.edit(chatId, msgId, text, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
  }
  if (cmd === "sorders") {
    const shopId = parts[2];
    const { data: orders } = await db().from("shop_orders").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
    let text = `🧾 <b>Заказы магазина</b> (${orders?.length || 0})\n\n`;
    const rows: Btn[][] = [];
    for (const o of orders || []) { text += `<code>${o.order_number}</code> — $${Number(o.total_amount).toFixed(2)} [${o.status}]\n`; rows.push([btn(o.order_number, `adm:ocard:S:${o.id}`)]); }
    if (!orders?.length) text += "Нет заказов.\n";
    rows.push([btn("◀️ К магазину", `adm:scard:${shopId}`)]);
    return tg.edit(chatId, msgId, text, ikb(rows));
  }
  if (cmd === "scusts") {
    const shopId = parts[2];
    const { data: custs } = await db().from("shop_customers").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
    let text = `👥 <b>Клиенты магазина</b> (${custs?.length || 0})\n\n`;
    for (const c of custs || []) {
      const name = c.first_name + (c.last_name ? ` ${c.last_name}` : "");
      text += `• ${esc(name)} [${c.telegram_id}] — $${Number(c.balance).toFixed(2)}${c.is_blocked ? " 🚫" : ""}\n`;
    }
    if (!custs?.length) text += "Нет клиентов.\n";
    return tg.edit(chatId, msgId, text, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
  }
  if (cmd === "spromo") {
    const shopId = parts[2];
    const { data: promos } = await db().from("shop_promocodes").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    let text = `🎟 <b>Промокоды магазина</b> (${promos?.length || 0})\n\n`;
    for (const p of promos || []) {
      text += `${p.is_active ? "✅" : "❌"} <code>${p.code}</code> — ${p.discount_type === "percent" ? `${p.discount_value}%` : `$${p.discount_value}`} (${p.used_count}/${p.max_uses || "∞"})\n`;
    }
    if (!promos?.length) text += "Нет промокодов.\n";
    return tg.edit(chatId, msgId, text, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
  }
  if (cmd === "srevs") {
    const shopId = parts[2];
    const { data: reviews } = await db().from("shop_reviews").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
    let text = `⭐ <b>Отзывы магазина</b> (${reviews?.length || 0})\n\n`;
    for (const r of reviews || []) text += `${"⭐".repeat(r.rating)} ${esc(r.author)} [${r.moderation_status}]\n${esc(r.text.slice(0, 60))}\n\n`;
    if (!reviews?.length) text += "Нет отзывов.\n";
    return tg.edit(chatId, msgId, text, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
  }
  if (cmd === "slogs") {
    const shopId = parts[2];
    const { data: logs } = await db().from("shop_admin_logs").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20);
    let text = `📋 <b>Логи магазина</b> (${logs?.length || 0})\n\n`;
    for (const l of logs || []) text += `<code>${new Date(l.created_at).toLocaleString("ru")}</code> ${l.admin_telegram_id} → ${esc(l.action)}\n`;
    if (!logs?.length) text += "Нет логов.\n";
    return tg.edit(chatId, msgId, text, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
  }

  // ─── Orders ───────────────────────────────
  if (cmd === "orders") return admOrdersList(tg, chatId, msgId, parts[2] || "all", parseInt(parts[3]) || 0);
  if (cmd === "ocard") return admOrderCard(tg, chatId, msgId, parts[2], parts[3]);
  if (cmd === "osearch") { await setSession(chatId, "adm_search_order", {}); return tg.edit(chatId, msgId, "🔍 Введите номер заказа, invoice_id или TG ID:", ikb([[btn("❌ Отмена", "adm:orders:all:0")]])); }

  // ─── Finance ──────────────────────────────
  if (cmd === "finance") return admFinance(tg, chatId, msgId, parts[2] || "sub", parseInt(parts[3]) || 0);

  // ─── Bots ─────────────────────────────────
  if (cmd === "bots") return admBotsList(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "bcard") return admBotCard(tg, chatId, msgId, parts[2]);
  if (cmd === "brevalidate") {
    const shopId = parts[2];
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const { data: s } = await db().from("shops").select("bot_token_encrypted").eq("id", shopId).single();
    if (!s?.bot_token_encrypted || !encKey) return tg.edit(chatId, msgId, "❌ Нет токена.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: s.bot_token_encrypted, p_key: encKey });
    if (!rawToken) return tg.edit(chatId, msgId, "❌ Ошибка расшифровки.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    const validation = await validateBotToken(rawToken);
    await db().from("shops").update({ bot_id: validation.bot_id || null, bot_username: validation.bot_username || null, bot_validated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(adminTgId, "revalidate_bot", "shop", shopId, { ok: validation.ok, bot_username: validation.bot_username });
    return tg.edit(chatId, msgId, validation.ok ? `✅ Бот валиден: @${validation.bot_username}` : `❌ Ошибка: ${validation.error}`, ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
  }
  if (cmd === "breset") {
    const shopId = parts[2];
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const { data: s } = await db().from("shops").select("bot_token_encrypted").eq("id", shopId).single();
    if (!s?.bot_token_encrypted || !encKey) return tg.edit(chatId, msgId, "❌ Нет токена.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: s.bot_token_encrypted, p_key: encKey });
    if (!rawToken) return tg.edit(chatId, msgId, "❌ Ошибка расшифровки.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    const result = await setupSellerWebhook(rawToken, shopId);
    await db().from("shops").update({ webhook_status: result.ok ? "active" : "failed", updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(adminTgId, "reset_webhook", "shop", shopId, { ok: result.ok });
    return tg.edit(chatId, msgId, result.ok ? "✅ Webhook переустановлен." : `❌ Ошибка: ${result.error}`, ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
  }
  if (cmd === "bremove") {
    const shopId = parts[2];
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const { data: s } = await db().from("shops").select("bot_token_encrypted").eq("id", shopId).single();
    if (!s?.bot_token_encrypted || !encKey) return tg.edit(chatId, msgId, "❌ Нет токена.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: s.bot_token_encrypted, p_key: encKey });
    if (rawToken) await removeSellerWebhook(rawToken);
    await db().from("shops").update({ webhook_status: "none", updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(adminTgId, "remove_webhook", "shop", shopId);
    return tg.edit(chatId, msgId, "✅ Webhook удалён.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
  }
  if (cmd === "boptest") {
    const shopId = parts[2];
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    const { data: s } = await db().from("shops").select("bot_token_encrypted, required_channel_id").eq("id", shopId).single();
    if (!s?.bot_token_encrypted || !s?.required_channel_id || !encKey) return tg.edit(chatId, msgId, "❌ Нет токена или канала.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: s.bot_token_encrypted, p_key: encKey });
    if (!rawToken) return tg.edit(chatId, msgId, "❌ Ошибка расшифровки.", ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    try {
      const testRes = await fetch(`https://api.telegram.org/bot${rawToken}/getChatMember`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: s.required_channel_id, user_id: chatId }) }).then(r => r.json());
      const msg = testRes.ok ? `✅ Доступ к каналу ${esc(s.required_channel_id)}: ${testRes.result.status}` : `❌ ${esc(testRes.description || "Нет доступа")}`;
      return tg.edit(chatId, msgId, msg, ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]]));
    } catch (e) { return tg.edit(chatId, msgId, `❌ ${(e as Error).message}`, ikb([[btn("◀️ Назад", `adm:bcard:${shopId}`)]])); }
  }

  // ─── Promocodes (goods) ────────────────────
  if (cmd === "promo") return admPromoList(tg, chatId, msgId, parts[2] || "platform", parseInt(parts[3]) || 0);

  // ─── Subscription Promos ──────────────────
  if (cmd === "subpromo") return admSubPromoList(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "spcard") return admSubPromoCard(tg, chatId, msgId, parts[2]);
  if (cmd === "spusage") return admSubPromoUsages(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
  if (cmd === "spcreate") {
    await setSession(chatId, "adm_sp_create", { step: "code" });
    return tg.edit(chatId, msgId, `🎫 <b>Создание промокода подписки</b>\n\nВведите код промокода (латиница, цифры):`, ikb([[btn("❌ Отмена", "adm:subpromo:0")]]));
  }
  if (cmd === "spdt") {
    const discountType = parts[2] as string; // "percent" or "fixed"
    const ses = await getSession(chatId);
    if (ses?.state !== "adm_sp_create") return;
    await setSession(chatId, "adm_sp_create", { ...((ses.data || {}) as any), discount_type: discountType, step: "discount_value" });
    return tg.send(chatId, `Тип: ${discountType === "percent" ? "процент" : "фиксированная $"}\n\nВведите значение скидки (число):`);
  }
  if (cmd === "sptoggle") {
    const promoId = parts[2];
    const { data: pr } = await db().from("platform_subscription_promos").select("is_active, code").eq("id", promoId).single();
    if (!pr) return;
    const newActive = !pr.is_active;
    await db().from("platform_subscription_promos").update({ is_active: newActive, updated_at: new Date().toISOString() }).eq("id", promoId);
    await admLog(adminTgId, newActive ? "activate_sub_promo" : "deactivate_sub_promo", "sub_promo", promoId, { code: pr.code });
    return admSubPromoCard(tg, chatId, msgId, promoId);
  }
  if (cmd === "spdelete") {
    const promoId = parts[2];
    return tg.edit(chatId, msgId, `⚠️ <b>Удалить промокод подписки?</b>\n\nЭто необратимо. Все данные использований будут потеряны.`, ikb([
      [btn("✅ Да, удалить", `adm:spdelconfirm:${promoId}`), btn("❌ Отмена", `adm:spcard:${promoId}`)],
    ]));
  }
  if (cmd === "spdelconfirm") {
    const promoId = parts[2];
    const { data: pr } = await db().from("platform_subscription_promos").select("code").eq("id", promoId).maybeSingle();
    await db().from("platform_subscription_promos").delete().eq("id", promoId);
    await admLog(adminTgId, "delete_sub_promo", "sub_promo", promoId, { code: pr?.code });
    return tg.edit(chatId, msgId, `✅ Промокод удалён.`, ikb([[btn("◀️ К промокодам", "adm:subpromo:0")]]));
  }
  if (cmd === "spnote") {
    const promoId = parts[2];
    await setSession(chatId, "adm_sp_note", { promoId });
    return tg.edit(chatId, msgId, `📝 Введите заметку для промокода:`, ikb([[btn("❌ Отмена", `adm:spcard:${promoId}`)]]));
  }

  // ─── Reviews ──────────────────────────────
  if (cmd === "reviews") return admReviewsList(tg, chatId, msgId, parts[2] || "shop", parseInt(parts[3]) || 0);
  if (cmd === "rapprove" || cmd === "rreject" || cmd === "rdelete") {
    const type = parts[2]; const reviewId = parts[3];
    const table = type === "P" ? "reviews" : "shop_reviews";
    if (cmd === "rdelete") { await db().from(table).delete().eq("id", reviewId); await admLog(adminTgId, "delete_review", table, reviewId); }
    else { const newStatus = cmd === "rapprove" ? "approved" : "rejected"; await db().from(table).update({ moderation_status: newStatus }).eq("id", reviewId); await admLog(adminTgId, `${newStatus}_review`, table, reviewId); }
    // Re-render in shop mode by default
    return admReviewsList(tg, chatId, msgId, "shop", 0);
  }

  // ─── Broadcast ────────────────────────────
  if (cmd === "broadcast") return admBroadcastMenu(tg, chatId, msgId);
  if (cmd === "bcast") {
    const target = parts[2]; // all | owners
    await setSession(chatId, "adm_broadcast_text", { target });
    let label = target === "all" ? "всем пользователям" : "владельцам магазинов";
    return tg.edit(chatId, msgId, `📢 Рассылка <b>${label}</b>\n\nВведите текст сообщения (поддерживается HTML):`, ikb([[btn("❌ Отмена", "adm:broadcast")]]));
  }
  if (cmd === "bcastconfirm") {
    const session = await getSession(chatId);
    if (!session || session.state !== "adm_broadcast_preview") return;
    const sData = session.data as Record<string, unknown>;
    const target = sData.target as string;
    const message = sData.message as string;
    const token = Deno.env.get("PLATFORM_BOT_TOKEN")!;
    // Get recipients
    let recipients: number[] = [];
    if (target === "all") {
      const { data } = await db().from("platform_users").select("telegram_id");
      recipients = data?.map(u => u.telegram_id) || [];
    } else if (target === "owners") {
      const { data: shops } = await db().from("shops").select("owner_id");
      const ownerIds = [...new Set(shops?.map(s => s.owner_id) || [])];
      if (ownerIds.length) {
        const { data: users } = await db().from("platform_users").select("telegram_id").in("id", ownerIds);
        recipients = users?.map(u => u.telegram_id) || [];
      }
    }
    let sent = 0; let failed = 0;
    for (const tgId of recipients) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: tgId, text: message, parse_mode: "HTML" }) });
        sent++;
      } catch { failed++; }
    }
    await clearSession(chatId);
    await admLog(adminTgId, "broadcast", "platform", target, { sent, failed, total: recipients.length });
    return tg.edit(chatId, msgId, `✅ Рассылка завершена!\n\n✅ Отправлено: ${sent}\n❌ Ошибок: ${failed}`, ikb([[btn("◀️ Меню", "adm:home")]]));
  }
  if (cmd === "bcastcancel") { await clearSession(chatId); return admBroadcastMenu(tg, chatId, msgId); }

  // ─── Risks ────────────────────────────────
  if (cmd === "risks") return admRisks(tg, chatId, msgId);
  if (cmd === "riskclear") {
    await db().from("rate_limits").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admLog(adminTgId, "clear_rate_limits");
    return admRisks(tg, chatId, msgId);
  }
  if (cmd === "riskblocked") {
    const { data: blocked } = await db().from("user_profiles").select("telegram_id, first_name, username").eq("is_blocked", true).limit(20);
    let text = `🚫 <b>Заблокированные</b> (${blocked?.length || 0})\n\n`;
    const rows: Btn[][] = [];
    for (const u of blocked || []) { text += `• ${esc(u.first_name)} ${u.username ? `@${u.username}` : ""} [${u.telegram_id}]\n`; rows.push([btn(`${u.first_name} [${u.telegram_id}]`, `adm:ucard:${u.telegram_id}`)]); }
    if (!blocked?.length) text += "Никто не заблокирован.\n";
    rows.push([btn("◀️ Назад", "adm:risks")]);
    return tg.edit(chatId, msgId, text, ikb(rows));
  }
  if (cmd === "riskbots") {
    const { data: shops } = await db().from("shops").select("id, name, bot_username, webhook_status").not("bot_token_encrypted", "is", null).neq("webhook_status", "active").limit(20);
    let text = `⚠️ <b>Broken bots</b> (${shops?.length || 0})\n\n`;
    const rows: Btn[][] = [];
    for (const s of shops || []) { text += `❌ ${esc(s.name)} — ${s.bot_username || "?"} [${s.webhook_status}]\n`; rows.push([btn(s.name, `adm:bcard:${s.id}`)]); }
    if (!shops?.length) text += "Всё в порядке.\n";
    rows.push([btn("◀️ Назад", "adm:risks")]);
    return tg.edit(chatId, msgId, text, ikb(rows));
  }

  // ─── Logs ─────────────────────────────────
  if (cmd === "logs") return admLogsList(tg, chatId, msgId, parseInt(parts[2]) || 0);

  // ─── Settings ─────────────────────────────
  if (cmd === "settings") return admSettings(tg, chatId, msgId);
  if (cmd === "setedit") { await setSession(chatId, "adm_edit_setting", {}); return tg.edit(chatId, msgId, "✏️ Введите в формате:\n<code>ключ = значение</code>\n\nНапример: <code>support_username = @support</code>", ikb([[btn("❌ Отмена", "adm:settings")]])); }

  // ─── Platform OP management ───────────────
  if (cmd === "platop") {
    const channels = await getPlatformChannelIds();
    const channelLink = await getPlatformChannelLink();
    const opEnabled = channels.length > 0;
    const text = `📢 <b>Настройки ОП платформы</b>\n\n` +
      `Статус: ${opEnabled ? "✅ Активна" : "❌ Не активна"}\n` +
      `ID каналов: ${channels.length ? `<code>${esc(channels.join(", "))}</code>` : "— не задан"}\n` +
      `Ссылка: ${channelLink ? esc(channelLink) : "— авто"}`;
    return tg.edit(chatId, msgId, text, ikb([
      [btn("✏️ Задать ID канала", "adm:platop_setid")],
      [btn("🔗 Задать ссылку", "adm:platop_setlink")],
      [btn("🗑 Очистить ОП", "adm:platop_clear")],
      [btn("◀️ Назад", "adm:settings")],
    ]));
  }
  if (cmd === "platop_setid") {
    await setSession(chatId, "adm_platop_set_id", {});
    return tg.edit(chatId, msgId, `📢 Введите ID канала для ОП платформы:\n\n<code>@channel_name</code> или <code>-100xxxxxxxxxx</code>\n\nМожно указать несколько через запятую.`, ikb([[btn("❌ Отмена", "adm:platop")]]));
  }
  if (cmd === "platop_setlink") {
    await setSession(chatId, "adm_platop_set_link", {});
    return tg.edit(chatId, msgId, `🔗 Введите ссылку на канал:\n\n<code>https://t.me/channel_name</code>`, ikb([[btn("❌ Отмена", "adm:platop")]]));
  }
  if (cmd === "platop_clear") {
    // Upsert empty value so DB record exists and env fallback is skipped
    await db().from("shop_settings").upsert({ key: "platform_channel_id", value: "", updated_at: new Date().toISOString() }, { onConflict: "key" });
    await db().from("shop_settings").delete().eq("key", "platform_channel_link");
    await admLog(adminTgId, "clear_platform_op", "settings", "platform_op");
    return tg.edit(chatId, msgId, "✅ ОП платформы очищена. Подписка на канал больше не требуется.", ikb([[btn("◀️ Настройки ОП", "adm:platop")], [btn("◀️ Настройки", "adm:settings")]]));
  }

  // ─── Welcome message management ───────────
  if (cmd === "welcmgr") {
    const config = await getWelcomeConfig();
    const hasCustom = !!config.text;
    const mediaLabel = config.media_type === "photo" ? "📷 Фото" : config.media_type === "video" ? "🎬 Видео" : "❌ Нет";
    let text = `👋 <b>Управление приветствием</b>\n\n`;
    text += `Статус: ${hasCustom ? "✅ Пользовательское" : "📝 По умолчанию"}\n`;
    text += `Медиа: ${mediaLabel}\n`;
    if (config.text) text += `\n<b>Текст:</b>\n${config.text.slice(0, 300)}${config.text.length > 300 ? "…" : ""}`;
    return tg.edit(chatId, msgId, text, ikb([
      [btn("✏️ Задать текст", "adm:welc_settext")],
      [btn("📷 Фото", "adm:welc_setmedia:photo"), btn("🎬 Видео", "adm:welc_setmedia:video")],
      [btn("🗑 Убрать медиа", "adm:welc_clearmedia")],
      [btn("👁 Предпросмотр", "adm:welc_preview")],
      [btn("🗑 Сбросить к дефолту", "adm:welc_reset")],
      [btn("◀️ Назад", "adm:settings")],
    ]));
  }
  if (cmd === "welc_settext") {
    await setSession(chatId, "adm_welc_set_text", {});
    return tg.edit(chatId, msgId, `✏️ <b>Введите текст приветствия</b>\n\nПоддерживается HTML:\n<code>&lt;b&gt;жирный&lt;/b&gt;</code>\n<code>&lt;i&gt;курсив&lt;/i&gt;</code>\n<code>&lt;u&gt;подчёркнутый&lt;/u&gt;</code>\n<code>&lt;a href="url"&gt;ссылка&lt;/a&gt;</code>\n<code>&lt;code&gt;код&lt;/code&gt;</code>\n\nПлейсхолдер: <code>{name}</code> — имя пользователя`, ikb([[btn("❌ Отмена", "adm:welcmgr")]]));
  }
  if (cmd === "welc_setmedia") {
    const mediaType = parts[2]; // photo or video
    await setSession(chatId, "adm_welc_set_media", { media_type: mediaType });
    const typeLabel = mediaType === "photo" ? "фото" : "видео";
    return tg.edit(chatId, msgId, `📎 Отправьте ${typeLabel} или введите URL/file_id:`, ikb([[btn("❌ Отмена", "adm:welcmgr")]]));
  }
  if (cmd === "welc_clearmedia") {
    await db().from("shop_settings").delete().eq("key", "platform_welcome_media_type");
    await db().from("shop_settings").delete().eq("key", "platform_welcome_media_url");
    await admLog(adminTgId, "clear_welcome_media", "settings", "welcome");
    return tg.edit(chatId, msgId, "✅ Медиа убрано.", ikb([[btn("◀️ Назад", "adm:welcmgr")]]));
  }
  if (cmd === "welc_preview") {
    const config = await getWelcomeConfig();
    const previewText = config.text ? config.text.replace(/\{name\}/g, "Тест") : `👋 Привет, <b>Тест</b>!\nДобро пожаловать в <b>${PLATFORM_NAME}</b>\n\n(дефолтное сообщение)`;
    if (config.media_type === "photo" && config.media_url) {
      await tg.sendPhoto(chatId, config.media_url, previewText);
    } else if (config.media_type === "video" && config.media_url) {
      await tg.sendVideo(chatId, config.media_url, previewText);
    } else {
      await tg.send(chatId, `👁 <b>Предпросмотр:</b>\n\n${previewText}`);
    }
    return;
  }
  if (cmd === "welc_reset") {
    await db().from("shop_settings").delete().eq("key", "platform_welcome_text");
    await db().from("shop_settings").delete().eq("key", "platform_welcome_media_type");
    await db().from("shop_settings").delete().eq("key", "platform_welcome_media_url");
    await admLog(adminTgId, "reset_welcome", "settings", "welcome");
    return tg.edit(chatId, msgId, "✅ Приветствие сброшено к дефолту.", ikb([[btn("◀️ Назад", "adm:welcmgr")]]));
  }

  if (cmd === "admins") return admAdminsList(tg, chatId, msgId);
  if (cmd === "addadmin") { await setSession(chatId, "adm_add_admin", {}); return tg.edit(chatId, msgId, "👮 Введите Telegram ID нового администратора:", ikb([[btn("❌ Отмена", "adm:admins")]])); }
  if (cmd === "rmadmin") {
    const tgId = parseInt(parts[2]);
    const role = await getAdminRole(adminTgId);
    if (role !== "owner") return tg.edit(chatId, msgId, "❌ Только owner может удалять админов.", ikb([[btn("◀️ Назад", "adm:admins")]]));
    await db().from("platform_admins").delete().eq("telegram_id", tgId);
    await admLog(adminTgId, "remove_admin", "admin", String(tgId));
    return admAdminsList(tg, chatId, msgId);
  }
  if (cmd === "setrole") {
    const tgId = parseInt(parts[2]); const newRole = parts[3];
    const role = await getAdminRole(adminTgId);
    if (role !== "owner") return tg.edit(chatId, msgId, "❌ Только owner может менять роли.", ikb([[btn("◀️ Назад", "adm:admins")]]));
    await db().from("platform_admins").update({ role: newRole }).eq("telegram_id", tgId);
    await admLog(adminTgId, "change_admin_role", "admin", String(tgId), { new_role: newRole });
    return admAdminsList(tg, chatId, msgId);
  }
}

// ═══════════════════════════════════════════════
// ADM TEXT HANDLER (FSM)
// ═══════════════════════════════════════════════
async function handleAdmText(tg: ReturnType<typeof TG>, chatId: number, val: string, state: string, sData: Record<string, unknown>) {
  if (state === "adm_search_user") {
    await clearSession(chatId);
    // Search by TG ID, username, or name
    let results: any[] = [];
    if (/^\d+$/.test(val)) {
      const { data } = await db().from("platform_users").select("*").eq("telegram_id", parseInt(val));
      results = data || [];
    }
    if (!results.length && val.startsWith("@")) {
      const { data } = await db().from("platform_users").select("*").ilike("username", val.slice(1));
      results = data || [];
    }
    if (!results.length) {
      const { data } = await db().from("platform_users").select("*").or(`first_name.ilike.%${val}%,last_name.ilike.%${val}%,username.ilike.%${val}%`);
      results = data || [];
    }
    if (!results.length) return tg.send(chatId, "❌ Ничего не найдено.", ikb([[btn("◀️ Назад", "adm:users:0")]]));
    let text = `🔍 <b>Результаты</b> (${results.length})\n\n`;
    const rows: Btn[][] = [];
    for (const u of results.slice(0, 10)) {
      const name = u.first_name + (u.last_name ? ` ${u.last_name}` : "");
      text += `• ${esc(name)} [${u.telegram_id}]\n`;
      rows.push([btn(`${esc(name)} [${u.telegram_id}]`, `adm:ucard:${u.telegram_id}`)]);
    }
    rows.push([btn("◀️ Назад", "adm:users:0")]);
    return tg.send(chatId, text, ikb(rows));
  }

  if (state === "adm_search_shop") {
    await clearSession(chatId);
    let results: any[] = [];
    if (/^\d+$/.test(val)) {
      // Search by owner TG ID
      const { data: user } = await db().from("platform_users").select("id").eq("telegram_id", parseInt(val)).maybeSingle();
      if (user) { const { data } = await db().from("shops").select("*").eq("owner_id", user.id); results = data || []; }
    }
    if (!results.length && val.startsWith("@")) {
      const { data } = await db().from("shops").select("*").ilike("bot_username", val.slice(1));
      results = data || [];
    }
    if (!results.length) {
      const { data } = await db().from("shops").select("*").or(`name.ilike.%${val}%,slug.ilike.%${val}%`);
      results = data || [];
    }
    if (!results.length) return tg.send(chatId, "❌ Ничего не найдено.", ikb([[btn("◀️ Назад", "adm:shops:0")]]));
    let text = `🔍 <b>Результаты</b> (${results.length})\n\n`;
    const rows: Btn[][] = [];
    for (const s of results.slice(0, 10)) {
      const dot = s.status === "active" ? "🟢" : "🔴";
      text += `${dot} ${esc(s.name)} (${s.slug})\n`;
      rows.push([btn(`${dot} ${s.name}`, `adm:scard:${s.id}`)]);
    }
    rows.push([btn("◀️ Назад", "adm:shops:0")]);
    return tg.send(chatId, text, ikb(rows));
  }

  if (state === "adm_search_order") {
    await clearSession(chatId);
    let found = false;
    // Search platform orders
    const { data: po } = await db().from("orders").select("*").or(`order_number.ilike.%${val}%,invoice_id.ilike.%${val}%${/^\d+$/.test(val) ? `,telegram_id.eq.${val}` : ""}`).limit(10);
    const { data: so } = await db().from("shop_orders").select("*, shops!inner(name)").or(`order_number.ilike.%${val}%,invoice_id.ilike.%${val}%${/^\d+$/.test(val) ? `,buyer_telegram_id.eq.${val}` : ""}`).limit(10);
    let text = `🔍 <b>Результаты заказов</b>\n\n`;
    const rows: Btn[][] = [];
    for (const o of po || []) { text += `🌐 <code>${o.order_number}</code> — $${Number(o.total_amount).toFixed(2)} [${o.status}]\n`; rows.push([btn(`🌐 ${o.order_number}`, `adm:ocard:P:${o.id}`)]); found = true; }
    for (const o of so || []) { text += `🏪 <code>${o.order_number}</code> — $${Number(o.total_amount).toFixed(2)} [${o.status}] (${esc((o as any).shops?.name || "")})\n`; rows.push([btn(`🏪 ${o.order_number}`, `adm:ocard:S:${o.id}`)]); found = true; }
    if (!found) text += "Ничего не найдено.\n";
    rows.push([btn("◀️ Назад", "adm:orders:all:0")]);
    return tg.send(chatId, text, ikb(rows));
  }

  if (state === "adm_user_balance") {
    const targetTgId = sData.target_tg_id as number;
    const match = val.match(/^([+-]?)(\d+(?:\.\d+)?)$/);
    if (!match) return tg.send(chatId, "❌ Формат: +10 или -5");
    const sign = match[1] === "-" ? -1 : 1;
    const amount = parseFloat(match[2]) * sign;
    if (amount > 0) {
      await db().rpc("credit_balance", { p_telegram_id: targetTgId, p_amount: Math.abs(amount) });
    } else {
      await db().rpc("deduct_balance", { p_telegram_id: targetTgId, p_amount: Math.abs(amount) });
    }
    // Log to balance_history
    const { data: up } = await db().from("user_profiles").select("balance").eq("telegram_id", targetTgId).maybeSingle();
    await db().from("balance_history").insert({
      telegram_id: targetTgId,
      amount: Math.abs(amount),
      type: amount > 0 ? "credit" : "debit",
      balance_after: Number(up?.balance || 0),
      admin_telegram_id: chatId,
      comment: `Superadmin ${amount > 0 ? "credit" : "debit"}`,
    });
    await admLog(chatId, amount > 0 ? "credit_balance" : "debit_balance", "user", String(targetTgId), { amount });
    await clearSession(chatId);
    return tg.send(chatId, `✅ Баланс обновлён: ${amount > 0 ? "+" : ""}${amount}`, ikb([[btn("◀️ К пользователю", `adm:ucard:${targetTgId}`)]]));
  }

  if (state === "adm_user_note") {
    const targetTgId = sData.target_tg_id as number;
    await db().from("user_profiles").update({ internal_note: val, updated_at: new Date().toISOString() }).eq("telegram_id", targetTgId);
    await clearSession(chatId);
    return tg.send(chatId, "✅ Заметка сохранена.", ikb([[btn("◀️ К пользователю", `adm:ucard:${targetTgId}`)]]));
  }

  if (state === "adm_user_msg") {
    const targetTgId = sData.target_tg_id as number;
    const token = Deno.env.get("PLATFORM_BOT_TOKEN")!;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: targetTgId, text: val, parse_mode: "HTML" }) });
      await clearSession(chatId);
      return tg.send(chatId, "✅ Сообщение отправлено.", ikb([[btn("◀️ К пользователю", `adm:ucard:${targetTgId}`)]]));
    } catch {
      await clearSession(chatId);
      return tg.send(chatId, "❌ Не удалось отправить.", ikb([[btn("◀️ К пользователю", `adm:ucard:${targetTgId}`)]]));
    }
  }

  if (state === "adm_broadcast_text") {
    const target = sData.target as string;
    // Preview
    let label = target === "all" ? "всем пользователям" : "владельцам магазинов";
    // Count recipients
    let count = 0;
    if (target === "all") { const { count: c } = await db().from("platform_users").select("id", { count: "exact", head: true }); count = c || 0; }
    else if (target === "owners") {
      const { data: shops } = await db().from("shops").select("owner_id");
      count = new Set(shops?.map(s => s.owner_id) || []).size;
    }
    await setSession(chatId, "adm_broadcast_preview", { target, message: val });
    const text = `📢 <b>Превью рассылки</b>\n\n<b>Аудитория:</b> ${label}\n<b>Получателей:</b> ${count}\n\n<b>Сообщение:</b>\n${val}\n\n⚠️ Подтвердите отправку:`;
    return tg.send(chatId, text, ikb([[btn("✅ Отправить", "adm:bcastconfirm"), btn("❌ Отмена", "adm:bcastcancel")]]));
  }

  if (state === "adm_edit_setting") {
    await clearSession(chatId);
    const match = val.match(/^(.+?)\s*=\s*(.+)$/);
    if (!match) return tg.send(chatId, "❌ Формат: <code>ключ = значение</code>", ikb([[btn("◀️ Назад", "adm:settings")]]));
    const key = match[1].trim(); const value = match[2].trim();
    await db().from("shop_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await admLog(chatId, "update_setting", "setting", key, { value });
    return tg.send(chatId, `✅ Настройка обновлена: <code>${esc(key)}</code> = ${esc(value)}`, ikb([[btn("◀️ К настройкам", "adm:settings")]]));
  }

  // ─── Platform OP: set channel ID ──────────
  if (state === "adm_platop_set_id") {
    await clearSession(chatId);
    const channelId = val.trim();
    await db().from("shop_settings").upsert({ key: "platform_channel_id", value: channelId, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await admLog(chatId, "set_platform_op_channel", "settings", "platform_channel_id", { channel_id: channelId });
    return tg.send(chatId, `✅ ID канала ОП платформы установлен:\n<code>${esc(channelId)}</code>`, ikb([[btn("◀️ Настройки ОП", "adm:platop")]]));
  }

  // ─── Platform OP: set channel link ────────
  if (state === "adm_platop_set_link") {
    await clearSession(chatId);
    const link = val.trim();
    await db().from("shop_settings").upsert({ key: "platform_channel_link", value: link, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await admLog(chatId, "set_platform_op_link", "settings", "platform_channel_link", { link });
    return tg.send(chatId, `✅ Ссылка на канал ОП установлена:\n${esc(link)}`, ikb([[btn("◀️ Настройки ОП", "adm:platop")]]));
  }

  // ─── Subscription Promo: create wizard ─────
  if (state === "adm_sp_create") {
    const step = sData.step as string;
    if (step === "code") {
      const code = val.trim().toUpperCase();
      if (!code || !/^[A-Z0-9_-]+$/.test(code)) return tg.send(chatId, "❌ Код должен содержать только латиницу, цифры, _ и -. Попробуйте снова:");
      // Check uniqueness
      const { data: existing } = await db().from("platform_subscription_promos").select("id").eq("code", code).maybeSingle();
      if (existing) return tg.send(chatId, `❌ Промокод <code>${esc(code)}</code> уже существует. Введите другой:`);
      await setSession(chatId, "adm_sp_create", { ...sData, code, step: "discount_type" });
      return tg.send(chatId, `Код: <code>${esc(code)}</code>\n\nВыберите тип скидки:`, ikb([
        [btn("📊 Процент", "adm:spdt:percent"), btn("💵 Фиксированная", "adm:spdt:fixed")],
      ]));
    }
    if (step === "discount_type") {
      const dt = val.toLowerCase();
      if (dt !== "percent" && dt !== "fixed" && dt !== "процент" && dt !== "фикс" && dt !== "%" && dt !== "$") {
        return tg.send(chatId, `Введите тип скидки: <code>percent</code> (процент) или <code>fixed</code> (фиксированная $):`);
      }
      const discountType = (dt === "percent" || dt === "процент" || dt === "%") ? "percent" : "fixed";
      await setSession(chatId, "adm_sp_create", { ...sData, discount_type: discountType, step: "discount_value" });
      return tg.send(chatId, `Тип: ${discountType === "percent" ? "процент" : "фиксированная $"}\n\nВведите значение скидки (число):`);
    }
    if (step === "discount_value") {
      const dv = parseFloat(val);
      if (isNaN(dv) || dv <= 0) return tg.send(chatId, "❌ Введите положительное число:");
      if (sData.discount_type === "percent" && dv > 100) return tg.send(chatId, "❌ Процент не может быть больше 100:");
      await setSession(chatId, "adm_sp_create", { ...sData, discount_value: dv, step: "max_uses" });
      return tg.send(chatId, `Скидка: ${dv}${sData.discount_type === "percent" ? "%" : "$"}\n\nВведите макс. число использований (или <code>0</code> = безлимит):`);
    }
    if (step === "max_uses") {
      const mu = parseInt(val);
      if (isNaN(mu) || mu < 0) return tg.send(chatId, "❌ Введите число ≥ 0:");
      await setSession(chatId, "adm_sp_create", { ...sData, max_uses: mu || null, step: "note" });
      return tg.send(chatId, `Лимит: ${mu || "безлимит"}\n\nВведите заметку (или <code>-</code> без заметки):`);
    }
    if (step === "note") {
      const note = val === "-" ? null : val;
      await clearSession(chatId);
      const code = sData.code as string;
      const { error } = await db().from("platform_subscription_promos").insert({
        code, discount_type: sData.discount_type, discount_value: sData.discount_value,
        max_uses: sData.max_uses || null, max_uses_per_user: 1,
        created_by: chatId, note,
      });
      if (error) return tg.send(chatId, `❌ Ошибка: ${error.message}`, ikb([[btn("◀️ К промокодам", "adm:subpromo:0")]]));
      await admLog(chatId, "create_sub_promo", "sub_promo", code, { discount_type: sData.discount_type, discount_value: sData.discount_value });
      return tg.send(chatId, `✅ Промокод <code>${esc(code)}</code> создан!\n\n${sData.discount_type === "percent" ? `${sData.discount_value}%` : `$${sData.discount_value}`} скидка на подписку`, ikb([[btn("◀️ К промокодам", "adm:subpromo:0")]]));
    }
  }

  // ─── Subscription Promo: note ─────────────
  if (state === "adm_sp_note") {
    const promoId = sData.promoId as string;
    const note = val === "-" ? null : val;
    await clearSession(chatId);
    await db().from("platform_subscription_promos").update({ note, updated_at: new Date().toISOString() }).eq("id", promoId);
    return tg.send(chatId, "✅ Заметка обновлена.", ikb([[btn("◀️ К промокоду", `adm:spcard:${promoId}`)]]));
  }

  // ─── Welcome: set text ────────────────────
  if (state === "adm_welc_set_text") {
    await clearSession(chatId);
    // Validate HTML by trying to send a test (Telegram will reject bad HTML)
    const testResult = await fetch(`https://api.telegram.org/bot${Deno.env.get("PLATFORM_BOT_TOKEN")}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: val.replace(/\{name\}/g, "Тест"), parse_mode: "HTML" }),
    }).then(r => r.json());
    if (!testResult.ok) {
      return tg.send(chatId, `❌ <b>Ошибка HTML</b>\n\nTelegram не принял ваш текст:\n<code>${esc(testResult.description || "unknown error")}</code>\n\nПроверьте теги и попробуйте снова.`, ikb([[btn("✏️ Попробовать снова", "adm:welc_settext")], [btn("◀️ Назад", "adm:welcmgr")]]));
    }
    // Delete test message
    if (testResult.result?.message_id) await tg.deleteMessage(chatId, testResult.result.message_id);
    await db().from("shop_settings").upsert({ key: "platform_welcome_text", value: val, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await admLog(chatId, "set_welcome_text", "settings", "welcome");
    return tg.send(chatId, `✅ Текст приветствия сохранён!`, ikb([[btn("👁 Предпросмотр", "adm:welc_preview")], [btn("◀️ Назад", "adm:welcmgr")]]));
  }

  // ─── Welcome: set media ───────────────────
  if (state === "adm_welc_set_media") {
    const mediaType = sData.media_type as string;
    await clearSession(chatId);
    // val could be a URL or file_id
    const mediaUrl = val.trim();
    await db().from("shop_settings").upsert({ key: "platform_welcome_media_type", value: mediaType, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await db().from("shop_settings").upsert({ key: "platform_welcome_media_url", value: mediaUrl, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await admLog(chatId, "set_welcome_media", "settings", "welcome", { media_type: mediaType });
    return tg.send(chatId, `✅ Медиа (${mediaType}) сохранено!`, ikb([[btn("👁 Предпросмотр", "adm:welc_preview")], [btn("◀️ Назад", "adm:welcmgr")]]));
  }

  if (state === "adm_add_admin") {
    await clearSession(chatId);
    const tgId = parseInt(val);
    if (!tgId || isNaN(tgId)) return tg.send(chatId, "❌ Введите числовой Telegram ID.", ikb([[btn("◀️ Назад", "adm:admins")]]));
    // Check role of current admin
    const role = await getAdminRole(chatId);
    if (role !== "owner") return tg.send(chatId, "❌ Только owner может добавлять админов.", ikb([[btn("◀️ Назад", "adm:admins")]]));
    // Insert
    const { error } = await db().from("platform_admins").insert({ telegram_id: tgId, role: "admin" });
    if (error) return tg.send(chatId, `❌ Ошибка: ${error.message}`, ikb([[btn("◀️ Назад", "adm:admins")]]));
    await admLog(chatId, "add_admin", "admin", String(tgId));
    return tg.send(chatId, `✅ Админ ${tgId} добавлен.`, ikb([[btn("◀️ К администраторам", "adm:admins")]]));
  }

  // ─── Toggle shop status (with comment) ────
  if (state === "adm_toggle_comment") {
    const shopId = sData.shopId as string;
    const newStatus = sData.newStatus as string;
    const shopName = sData.shopName as string;
    const comment = val === "-" ? "" : val;
    await clearSession(chatId);

    await db().from("shops").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(chatId, `shop_${newStatus}`, "shop", shopId, { comment });

    // Notify shop owner
    const { data: shop } = await db().from("shops").select("owner_id").eq("id", shopId).single();
    if (shop) {
      const { data: owner } = await db().from("platform_users").select("telegram_id").eq("id", shop.owner_id).maybeSingle();
      if (owner) {
        const token = Deno.env.get("PLATFORM_BOT_TOKEN")!;
        const statusLabel = newStatus === "paused" ? "⚠️ приостановлен" : "✅ активирован";
        let msg = `${newStatus === "paused" ? "⚠️" : "✅"} Ваш магазин «<b>${esc(shopName)}</b>» был ${statusLabel} администратором платформы.`;
        if (comment) msg += `\n\n📝 <b>Причина:</b> ${esc(comment)}`;
        if (newStatus === "paused") msg += `\n\nЕсли у вас есть вопросы, обратитесь в поддержку.`;
        try { await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: owner.telegram_id, text: msg, parse_mode: "HTML" }) }); } catch {}
      }
    }

    const resp = await tg.send(chatId, `✅ Магазин «${esc(shopName)}» ${newStatus === "paused" ? "приостановлен" : "активирован"}.${comment ? ` Причина: ${esc(comment)}` : ""}`, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
    return;
  }

  // ─── Delete shop (with comment) ───────────
  if (state === "adm_delete_comment") {
    const shopId = sData.shopId as string;
    const shopName = sData.shopName as string;
    const comment = val === "-" ? "" : val;
    await clearSession(chatId);

    await admLog(chatId, "delete_shop", "shop", shopId, { comment, shop_name: shopName });

    // Get owner info before deletion
    const { data: shop } = await db().from("shops").select("bot_token_encrypted, owner_id").eq("id", shopId).single();
    let ownerTgId: number | null = null;
    if (shop) {
      const { data: owner } = await db().from("platform_users").select("telegram_id").eq("id", shop.owner_id).maybeSingle();
      ownerTgId = owner?.telegram_id || null;

      // Cleanup webhook
      if (shop.bot_token_encrypted) {
        const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
        if (encKey) { try { const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: encKey }); if (rawToken) await removeSellerWebhook(rawToken); } catch {} }
      }
    }

    // Delete all related data
    const { data: products } = await db().from("shop_products").select("id").eq("shop_id", shopId);
    const prodIds = products?.map(p => p.id) || [];
    if (prodIds.length) { await db().from("shop_inventory").delete().in("product_id", prodIds); await db().from("shop_order_items").delete().in("product_id", prodIds); }
    await db().from("shop_reviews").delete().eq("shop_id", shopId);
    await db().from("shop_promocodes").delete().eq("shop_id", shopId);
    await db().from("shop_admin_logs").delete().eq("shop_id", shopId);
    await db().from("shop_products").delete().eq("shop_id", shopId);
    await db().from("shop_orders").delete().eq("shop_id", shopId);
    await db().from("shop_categories").delete().eq("shop_id", shopId);
    await db().from("shop_balance_history").delete().eq("shop_id", shopId);
    await db().from("shop_customers").delete().eq("shop_id", shopId);
    await db().from("shops").delete().eq("id", shopId);

    // Notify owner
    if (ownerTgId) {
      const token = Deno.env.get("PLATFORM_BOT_TOKEN")!;
      let msg = `❌ Ваш магазин «<b>${esc(shopName)}</b>» был удалён администратором платформы.`;
      if (comment) msg += `\n\n📝 <b>Причина:</b> ${esc(comment)}`;
      msg += `\n\nЕсли у вас есть вопросы, обратитесь в поддержку.`;
      try { await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: ownerTgId, text: msg, parse_mode: "HTML" }) }); } catch {}
    }

    return tg.send(chatId, `✅ Магазин «${esc(shopName)}» удалён.${comment ? ` Причина: ${esc(comment)}` : ""}`, ikb([[btn("◀️ К магазинам", "adm:shops:0")]]));
  }

  // ─── Set OP channel ID ─────────────────────
  if (state === "adm_op_set_id") {
    const shopId = sData.shopId as string;
    await clearSession(chatId);
    const channelId = val.trim();
    await db().from("shops").update({ required_channel_id: channelId, updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(chatId, "set_op_channel_id", "shop", shopId, { channel_id: channelId });
    return tg.send(chatId, `✅ ID канала установлен: <code>${esc(channelId)}</code>`, ikb([[btn("◀️ Настройки ОП", `adm:opsetc:${shopId}`)]]));
  }

  // ─── Set OP channel link ──────────────────
  if (state === "adm_op_set_link") {
    const shopId = sData.shopId as string;
    await clearSession(chatId);
    const channelLink = val.trim();
    await db().from("shops").update({ required_channel_link: channelLink, updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(chatId, "set_op_channel_link", "shop", shopId, { channel_link: channelLink });
    return tg.send(chatId, `✅ Ссылка на канал установлена: ${esc(channelLink)}`, ikb([[btn("◀️ Настройки ОП", `adm:opsetc:${shopId}`)]]));
  }

  // ─── Legacy: Set OP channel (combined) ────
  if (state === "adm_op_channel") {
    const shopId = sData.shopId as string;
    await clearSession(chatId);
    const parts = val.split(/\s+/);
    const channelId = parts[0];
    const channelLink = parts[1] || null;
    await db().from("shops").update({ required_channel_id: channelId, required_channel_link: channelLink, updated_at: new Date().toISOString() }).eq("id", shopId);
    await admLog(chatId, "set_op_channel", "shop", shopId, { channel_id: channelId, channel_link: channelLink });
    return tg.send(chatId, `✅ Канал ОП установлен: <code>${esc(channelId)}</code>`, ikb([[btn("◀️ К магазину", `adm:scard:${shopId}`)]]));
  }

  // ─── User: enter subscription promo code ──
  if (state === "sub_enter_promo") {
    await clearSession(chatId);
    const code = val.trim().toUpperCase();
    if (!code) return tg.send(chatId, "❌ Введите код.", ikb([[btn("◀️ Назад", "p:sub")]]));
    const { data: result } = await db().rpc("validate_platform_subscription_promo", { p_code: code, p_telegram_id: chatId });
    const r = result as any;
    if (!r || !r.valid) return tg.send(chatId, `❌ ${r?.error || "Промокод не найден"}`, ikb([[btn("🔄 Попробовать другой", "p:sub_promo")], [btn("◀️ Назад", "p:sub")]]));
    const SUBSCRIPTION_PRICE = 9;
    const discountAmount = r.discount_type === "percent" ? Math.min(SUBSCRIPTION_PRICE, SUBSCRIPTION_PRICE * r.discount_value / 100) : Math.min(SUBSCRIPTION_PRICE, Number(r.discount_value));
    const finalAmount = Math.max(0, SUBSCRIPTION_PRICE - discountAmount);
    await setSession(chatId, "sub_promo_applied", { promo_code: r.code, promo_id: r.id, discount_amount: discountAmount });
    return tg.send(chatId, `✅ Промокод <code>${esc(r.code)}</code> применён!\n\n💰 Стоимость: $${SUBSCRIPTION_PRICE.toFixed(2)}\n🏷 Скидка: -$${discountAmount.toFixed(2)}\n💵 К оплате: <b>$${finalAmount.toFixed(2)}</b>\n\nНажмите «Оплатить» для продолжения:`, ikb([[btn(`💳 Оплатить $${finalAmount.toFixed(2)}`, "p:pay_sub")], [btn("◀️ Без промокода", "p:sub")]]));
  }
}

// ═══════════════════════════════════════════════
// MAIN SERVE
// ═══════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "GET") return setupWebhook();
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const token = Deno.env.get("PLATFORM_BOT_TOKEN");
    if (!token) return new Response("No token", { status: 500 });
    const tg = TG(token);

    const body = await req.json();
    const msg = body.message;
    const cb = body.callback_query;

    // ─── Callback query ─────────────────────
    if (cb) {
      const chatId = cb.message?.chat?.id || cb.from?.id;
      const msgId = cb.message?.message_id;
      const data = cb.data;
      if (chatId && msgId && data) {
        if (data.startsWith("adm:")) {
          await handleAdmCallback(tg, chatId, msgId, data, cb.id, cb.from.id);
        } else if (data.startsWith("p:")) {
          // Blocked user guard for platform callbacks (except subscription check)
          if (data !== "p:checksub" && await isUserBlocked(cb.from.id)) {
            await tg.answer(cb.id, "🚫 Ваш аккаунт заблокирован.");
            return new Response("ok");
          }
          await handleCallback(tg, chatId, msgId, data, cb.id, cb.from);
        }
      }
      return new Response("ok");
    }

    // ─── Text message ───────────────────────
    if (msg) {
      const chatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const from = msg.from;

      // ─── /adm ─────────────────────────────
      if (text === "/adm") {
        const isAdmin = await isSuperAdmin(from.id);
        if (!isAdmin) {
          await tg.send(chatId, "❌ Доступ запрещён.");
          return new Response("ok");
        }
        await clearSession(chatId);
        await admHome(tg, chatId);
        return new Response("ok");
      }

      // ─── /start ───────────────────────────
      if (text === "/start" || text.startsWith("/start ")) {
        await clearSession(chatId);
        const subscribed = await enforceSubscription(tg, chatId, from.first_name);
        if (!subscribed) return new Response("ok");
        await upsertUser(from);
        // Blocked user check after upsert (so profile exists)
        if (await isUserBlocked(from.id)) {
          await tg.send(chatId, "🚫 Ваш аккаунт заблокирован. Обратитесь в поддержку.");
          return new Response("ok");
        }
        await sendWelcome(tg, chatId, from.first_name || "друг");
        return new Response("ok");
      }

      // ─── /help ────────────────────────────
      if (text === "/help") {
        const resp = await tg.send(chatId, "⏳");
        const mid = resp?.result?.message_id;
        if (mid) await howItWorks(tg, chatId, mid);
        return new Response("ok");
      }

      // ─── Blocked user guard for all other text ─
      if (text !== "🆘 Поддержка" && await isUserBlocked(from.id)) {
        await tg.send(chatId, "🚫 Ваш аккаунт заблокирован. Обратитесь в поддержку.");
        return new Response("ok");
      }

      // ─── Bottom panel buttons ─────────────
      if (text === "👤 Профиль") {
        if (!(await enforceSubscription(tg, chatId, from.first_name))) return new Response("ok");
        await showProfile(tg, chatId);
        return new Response("ok");
      }
      if (text === "🆘 Поддержка") {
        await tg.send(chatId, `🆘 Свяжитесь с поддержкой:\n${SUPPORT_LINK}`, ikb([[urlBtn("🆘 Написать в поддержку", SUPPORT_LINK)]]));
        return new Response("ok");
      }
      if (text === "🏪 Мои магазины") {
        if (!(await enforceSubscription(tg, chatId, from.first_name))) return new Response("ok");
        await myShops(tg, chatId);
        return new Response("ok");
      }
      if (text === "🏪 Создать магазин") {
        if (!(await enforceSubscription(tg, chatId, from.first_name))) return new Response("ok");
        // Start create shop wizard via same logic as callback p:create
        await clearSession(chatId);
        const resp = await tg.send(chatId, "⏳");
        const mid = resp?.result?.message_id;
        if (mid) await wizardStep(tg, chatId, 1, {}, mid);
        return new Response("ok");
      }

      // ─── Photo/Video message (for media FSM) ─
      const photo = msg.photo;
      const video = msg.video;
      if (photo || video) {
        const session = await getSession(chatId);
        if (session?.state === "adm_welc_set_media") {
          const sData = session.data as Record<string, unknown>;
          const mediaType = sData.media_type as string;
          await clearSession(chatId);
          let fileId = "";
          if (photo) fileId = photo[photo.length - 1].file_id;
          if (video) fileId = video.file_id;
          await db().from("shop_settings").upsert({ key: "platform_welcome_media_type", value: mediaType, updated_at: new Date().toISOString() }, { onConflict: "key" });
          await db().from("shop_settings").upsert({ key: "platform_welcome_media_url", value: fileId, updated_at: new Date().toISOString() }, { onConflict: "key" });
          await tg.send(chatId, `✅ Медиа (${mediaType}) сохранено!`, ikb([[btn("👁 Предпросмотр", "adm:welc_preview")], [btn("◀️ Назад", "adm:welcmgr")]]));
          return new Response("ok");
        }
      }

      // ─── FSM handler ──────────────────────
      await handleText(tg, chatId, text, from);
      return new Response("ok");
    }

    return new Response("ok");
  } catch (e) {
    console.error("Platform bot error:", e);
    return new Response("error", { status: 500 });
  }
});
