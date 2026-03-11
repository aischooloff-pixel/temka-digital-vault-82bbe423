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
    return {
      ok: true,
      bot_id: data.result.id,
      bot_username: data.result.username,
      first_name: data.result.first_name,
    };
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
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
        ...(secret ? { secret_token: secret } : {}),
      }),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description || "Failed to set webhook" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Network error setting webhook" };
  }
}

async function removeSellerWebhook(botToken: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
  } catch {}
}

// Full flow: validate + encrypt + save + set webhook
async function connectBotToken(rawToken: string, shopId: string): Promise<{ ok: boolean; message: string; bot_username?: string }> {
  // 1. Validate via getMe
  const validation = await validateBotToken(rawToken);
  if (!validation.ok) {
    return { ok: false, message: `❌ Токен невалиден: ${validation.error}\n\nПроверьте токен и попробуйте снова.` };
  }

  // 2. Encrypt token
  const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!encKey) {
    console.error("connectBotToken: TOKEN_ENCRYPTION_KEY not set");
    return { ok: false, message: "❌ Ошибка конфигурации сервера (ключ шифрования)." };
  }

  const { data: enc, error: encError } = await db().rpc("encrypt_token", { p_token: rawToken, p_key: encKey });
  if (encError || !enc) {
    console.error("connectBotToken: encryption failed", encError);
    return { ok: false, message: `❌ Ошибка шифрования токена: ${encError?.message || "unknown"}` };
  }

  // 3. Set webhook
  const webhookResult = await setupSellerWebhook(rawToken, shopId);

  // 4. Save to DB
  await db().from("shops").update({
    bot_token_encrypted: enc,
    bot_id: validation.bot_id,
    bot_username: validation.bot_username,
    webhook_status: webhookResult.ok ? "active" : "failed",
    bot_validated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", shopId);

  if (!webhookResult.ok) {
    return {
      ok: false,
      message: `⚠️ Бот @${validation.bot_username} валиден, но webhook не установлен: ${webhookResult.error}\n\nТокен сохранён. Попробуйте переподключить позже.`,
      bot_username: validation.bot_username,
    };
  }

  return {
    ok: true,
    message: `✅ Бот @${validation.bot_username} подключён!\n\n✅ Токен зашифрован\n✅ Webhook установлен\n✅ Бот готов к работе`,
    bot_username: validation.bot_username,
  };
}

// ─── Session FSM ──────────────────────────────
async function getSession(tgId: number) {
  const { data } = await db().from("platform_sessions").select("*").eq("telegram_id", tgId).maybeSingle();
  return data as { telegram_id: number; state: string; data: Record<string, unknown> } | null;
}
async function setSession(tgId: number, state: string, data: Record<string, unknown> = {}) {
  await db().from("platform_sessions").upsert(
    { telegram_id: tgId, state, data, updated_at: new Date().toISOString() },
    { onConflict: "telegram_id" },
  );
}
async function clearSession(tgId: number) {
  await db().from("platform_sessions").delete().eq("telegram_id", tgId);
}

// ─── Channel subscription check ───────────────
async function checkAllChannels(tg: ReturnType<typeof TG>, userId: number): Promise<boolean> {
  const raw = Deno.env.get("PLATFORM_CHANNEL_ID") || "";
  const channels = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (!channels.length) return true;
  for (const ch of channels) {
    try {
      const result = await tg.getChatMember(ch, userId);
      const status = result?.result?.status;
      if (!["member", "administrator", "creator"].includes(status)) return false;
    } catch {
      // skip failed checks
    }
  }
  return true;
}

function channelButtons(): Btn[][] {
  const raw = Deno.env.get("PLATFORM_CHANNEL_ID") || "";
  const channels = raw.split(",").map(s => s.trim()).filter(Boolean);
  const row: Btn[] = channels.map((ch, i) => {
    const link = ch.startsWith("@") ? `https://t.me/${ch.slice(1)}` : ch.startsWith("-100") ? `https://t.me/c/${ch.slice(4)}` : `https://t.me/${ch}`;
    return urlBtn(`📢 Канал ${channels.length > 1 ? i + 1 : ""}`.trim(), link);
  });
  return row.length ? [row, [btn("✅ Проверить подписку", "p:checksub")]] : [];
}

// ─── Upsert platform user ─────────────────────
async function upsertUser(from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  const { data: existing } = await db().from("platform_users").select("id").eq("telegram_id", from.id).maybeSingle();
  const fields = {
    first_name: from.first_name || "",
    last_name: from.last_name || null,
    username: from.username || null,
    is_premium: from.is_premium || false,
    language_code: from.language_code || null,
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    await db().from("platform_users").update(fields).eq("telegram_id", from.id);
    return existing;
  }
  const { data } = await db().from("platform_users").insert({ telegram_id: from.id, ...fields }).select("id").single();
  return data;
}

// ─── Bottom panel (keyboard) ──────────────────
const bottomPanel = () => ({
  keyboard: [[{ text: "👤 Профиль" }, { text: "🆘 Поддержка" }, { text: "🏪 Мои магазины" }]],
  resize_keyboard: true,
  is_persistent: true,
});

// ═══════════════════════════════════════════════
// WELCOME / START
// ═══════════════════════════════════════════════
async function sendWelcome(tg: ReturnType<typeof TG>, chatId: number, firstName: string) {
  const text =
    `👋 Привет, <b>${esc(firstName)}</b>!\n` +
    `Добро пожаловать в <b>${PLATFORM_NAME}</b>\n\n` +
    `Создай свой Telegram магазин\nс автовыдачей за 5 минут.\n\n` +
    `— Никакого кода и хостинга\n` +
    `— Автовыдача товаров 24/7\n` +
    `— Приём крипты через CryptoBot\n` +
    `— Полная настройка под себя`;

  await tg.send(chatId, text, {
    ...ikb([
      [btn("🏪 Создать магазин", "p:create"), btn("📖 Как это работает", "p:howitworks")],
      [btn("👤 Мой профиль", "p:profile")],
    ]),
  });
  await tg.send(chatId, "⬇️ Используй меню внизу для навигации", bottomPanel());
}

// ═══════════════════════════════════════════════
// HOW IT WORKS
// ═══════════════════════════════════════════════
function howItWorks(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const text =
    `📖 <b>Как это работает?</b>\n\n` +
    `1️⃣ <b>Создай магазин</b> — пройди простой онбординг из 7 шагов\n\n` +
    `2️⃣ <b>Добавь товары</b> — загрузи инвентарь прямо в бота\n\n` +
    `3️⃣ <b>Подключи оплату</b> — CryptoBot принимает крипту автоматически\n\n` +
    `4️⃣ <b>Поделись ссылкой</b> — клиенты покупают через твоего бота\n\n` +
    `5️⃣ <b>Автовыдача 24/7</b> — товар доставляется мгновенно после оплаты\n\n` +
    `💰 Стоимость: <b>$9/мес</b> — неограниченные магазины и товары`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("🏪 Создать магазин", "p:create")],
    [btn("◀️ Назад", "p:home")],
  ]));
}

// ═══════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════
async function showProfile(tg: ReturnType<typeof TG>, chatId: number, msgId?: number) {
  const { data: user } = await db().from("platform_users").select("*").eq("telegram_id", chatId).maybeSingle();
  if (!user) return;

  const { count: shopCount } = await db().from("shops").select("id", { count: "exact", head: true }).eq("owner_id", user.id);

  const subMap: Record<string, string> = { active: "✅ Активна", trial: "🆓 Пробный", expired: "❌ Истекла", cancelled: "❌ Отменена" };
  let daysLeft = "";
  if (user.subscription_expires_at) {
    const diff = Math.ceil((new Date(user.subscription_expires_at).getTime() - Date.now()) / 86400000);
    daysLeft = diff > 0 ? `\n⏳ Осталось: <b>${diff}</b> дней` : "\n⏳ Истекла";
  }

  const text =
    `👤 <b>Профиль</b>\n\n` +
    `🆔 ID: <code>${user.telegram_id}</code>\n` +
    `👤 Имя: <b>${esc(user.first_name)}${user.last_name ? " " + esc(user.last_name) : ""}</b>\n` +
    `📱 Юзернейм: ${user.username ? "@" + esc(user.username) : "—"}\n` +
    `📅 Регистрация: ${new Date(user.created_at).toLocaleDateString("ru-RU")}\n` +
    `💳 Подписка: ${subMap[user.subscription_status] || user.subscription_status}${daysLeft}\n` +
    `🏪 Магазинов: ${shopCount || 0}`;

  const kb = ikb([
    [btn("🏪 Мои магазины", "p:myshops:0")],
    [btn("💳 Подписка", "p:sub")],
    [btn("◀️ Назад", "p:home")],
  ]);

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
    const text = "🏪 <b>Мои магазины</b>\n\nУ тебя пока нет магазинов.";
    const kb = ikb([[btn("➕ Создать магазин", "p:create")], [btn("◀️ Назад", "p:home")]]);
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

  const text =
    `🏪 <b>${esc(shop.name)}</b>\n\n` +
    `📊 Статус: ${shop.status === "active" ? "активен" : "остановлен"} ${statusEmoji}\n` +
    `🔗 ${esc(shopUrl)}\n` +
    `📦 Товаров: ${productCount || 0}\n` +
    `🛍 Продаж: ${orderCount || 0}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("📋 Скопировать ссылку", `p:copylink:${shopId}`)],
    [btn("⚙️ Настройки", `p:settings:${shopId}`), btn("📊 Статистика", `p:stats:${shopId}`)],
    [btn("💳 Подписка", "p:sub"), btn("🗑 Удалить", `p:delshop:${shopId}`)],
    [btn("◀️ К магазинам", "p:myshops:0")],
  ]));
}

// ═══════════════════════════════════════════════
// SHOP SETTINGS — shows real bot status
// ═══════════════════════════════════════════════
async function shopSettings(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return tg.edit(chatId, msgId, "❌ Не найден", ikb([[btn("◀️ Назад", "p:myshops:0")]]));

  // Build real bot status
  let botStatus = "❌ не подключён";
  if (shop.bot_token_encrypted) {
    if (shop.bot_username && shop.webhook_status === "active") {
      botStatus = `✅ @${shop.bot_username} (webhook активен)`;
    } else if (shop.bot_username && shop.webhook_status === "failed") {
      botStatus = `⚠️ @${shop.bot_username} (webhook не установлен)`;
    } else if (shop.bot_username) {
      botStatus = `✅ @${shop.bot_username} (webhook: ${shop.webhook_status})`;
    } else {
      botStatus = "⚠️ токен сохранён, не валидирован";
    }
  }

  const text =
    `⚙️ <b>Настройки: ${esc(shop.name)}</b>\n\n` +
    `📛 Название: ${esc(shop.name)}\n` +
    `🎨 Цвет: ${shop.color}\n` +
    `📌 Заголовок: ${shop.hero_title || "—"}\n` +
    `📝 Описание: ${shop.hero_description ? esc(shop.hero_description.slice(0, 60)) + "…" : "—"}\n` +
    `👋 Приветствие: ${shop.welcome_message ? esc(shop.welcome_message.slice(0, 50)) + "…" : "—"}\n` +
    `🔗 Поддержка: ${shop.support_link || "—"}\n` +
    `🤖 Бот: ${botStatus}\n` +
    `💰 CryptoBot: ${shop.cryptobot_token_encrypted ? "✅ подключён" : "❌ не подключён"}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Название", `p:edit:${shopId}:name`), btn("🎨 Цвет", `p:edit:${shopId}:color`)],
    [btn("📌 Заголовок витрины", `p:edit:${shopId}:hero_title`)],
    [btn("📝 Описание витрины", `p:edit:${shopId}:hero_desc`)],
    [btn("👋 Приветствие", `p:edit:${shopId}:welcome`), btn("🔗 Поддержка", `p:edit:${shopId}:support`)],
    [btn("🤖 Токен бота", `p:setbot:${shopId}`), btn("💰 CryptoBot", `p:setcb:${shopId}`)],
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

  const text =
    `📊 <b>Статистика: ${esc(shop?.name || "")}</b>\n\n` +
    `🛍 Всего заказов: ${totalOrders || 0}\n` +
    `✅ Оплаченных: ${paidOrders || 0}\n` +
    `💰 Выручка: <b>$${totalRevenue.toFixed(2)}</b>\n\n` +
    `📦 Товаров: ${productCount || 0}\n` +
    `🗃 На складе: ${invCount || 0} единиц`;

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

  const text =
    `💳 <b>Подписка</b>\n\n` +
    `📊 Статус: <b>${subMap[user.subscription_status] || user.subscription_status}</b>${daysLeft}\n\n` +
    `💰 Стоимость: <b>$9/мес</b>\n\n` +
    `Включает:\n` +
    `• Неограниченное кол-во магазинов\n` +
    `• Приём платежей через CryptoBot\n` +
    `• Собственный Telegram-бот\n` +
    `• Авто-доставка цифровых товаров`;

  const rows: Btn[][] = [];
  if (user.subscription_status !== "active") {
    rows.push([btn("💳 Оплатить $9", "p:pay_sub")]);
  }
  rows.push([btn("◀️ Назад", "p:home")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// CREATE SHOP — 7-STEP WIZARD
// ═══════════════════════════════════════════════
const COLORS: Record<string, string> = {
  red: "#E53935", blue: "#2B7FFF", green: "#43A047",
  purple: "#8E24AA", black: "#212121", orange: "#FB8C00",
};

async function wizardStep(tg: ReturnType<typeof TG>, chatId: number, step: number, sData: Record<string, unknown>, msgId?: number) {
  let text = "";
  let kb: Btn[][] = [];
  const cancelRow = [btn("❌ Отмена", "p:home")];

  switch (step) {
    case 1:
      text = `📝 <b>Шаг 1 из 7</b>\n\nВведи название своего магазина\n\nНапример: <i>NickShop, Digital Store</i>`;
      kb = [cancelRow];
      await setSession(chatId, "wiz_1", sData);
      break;
    case 2:
      text = `🎨 <b>Шаг 2 из 7</b>\n\nВыбери цвет интерфейса магазина`;
      kb = [
        [btn("🔴 Красный", "p:wcolor:red"), btn("🔵 Синий", "p:wcolor:blue")],
        [btn("🟢 Зелёный", "p:wcolor:green"), btn("🟣 Фиолетовый", "p:wcolor:purple")],
        [btn("⚫ Чёрный", "p:wcolor:black"), btn("🟠 Оранжевый", "p:wcolor:orange")],
        [btn("✏️ Ввести HEX", "p:wcolor:custom")],
        [btn("◀️ Назад", "p:wback:1")],
        cancelRow,
      ];
      await setSession(chatId, "wiz_2", sData);
      break;
    case 3:
      text = `📌 <b>Шаг 3 из 7</b>\n\nВведи заголовок витрины\n<i>(крупный текст на главной странице магазина)</i>\n\nНапример: <i>Премиум цифровой маркетплейс</i>`;
      kb = [[btn("◀️ Назад", "p:wback:2")], cancelRow];
      await setSession(chatId, "wiz_3", sData);
      break;
    case 4:
      text = `📝 <b>Шаг 4 из 7</b>\n\nВведи описание витрины\n<i>(подзаголовок под заголовком)</i>\n\nНапример: <i>Проверенные аккаунты и скрипты.\nМгновенная доставка.</i>`;
      kb = [[btn("◀️ Назад", "p:wback:3")], cancelRow];
      await setSession(chatId, "wiz_4", sData);
      break;
    case 5:
      text = `👋 <b>Шаг 5 из 7</b>\n\nВведи приветственное сообщение для покупателей`;
      kb = [[btn("◀️ Назад", "p:wback:4")], cancelRow];
      await setSession(chatId, "wiz_5", sData);
      break;
    case 6:
      text = `🔗 <b>Шаг 6 из 7</b>\n\nВведи ссылку на поддержку\n\nНапример: <i>https://t.me/nickname</i>`;
      kb = [[btn("◀️ Назад", "p:wback:5")], cancelRow];
      await setSession(chatId, "wiz_6", sData);
      break;
    case 7:
      text =
        `🤖 <b>Шаг 7 из 7</b>\n\nВведи API токен своего Telegram бота\n\n` +
        `Как получить:\n` +
        `1. Открой @BotFather\n` +
        `2. Напиши /newbot\n` +
        `3. Следуй инструкции\n` +
        `4. Скопируй токен`;
      kb = [
        [urlBtn("📖 Подробная инструкция", "https://core.telegram.org/bots/tutorial")],
        [btn("◀️ Назад", "p:wback:6")],
        cancelRow,
      ];
      await setSession(chatId, "wiz_7", sData);
      break;
  }

  if (msgId) {
    return tg.edit(chatId, msgId, text, ikb(kb));
  }
  return tg.send(chatId, text, ikb(kb));
}

async function showConfirmation(tg: ReturnType<typeof TG>, chatId: number, sData: Record<string, unknown>, msgId?: number) {
  const colorName = Object.entries(COLORS).find(([, v]) => v === sData.color)?.[0] || sData.color;

  // Validate bot token before showing confirmation
  const botValidation = await validateBotToken(sData.bot_token as string);
  const botStatusText = botValidation.ok
    ? `✅ @${botValidation.bot_username}`
    : `❌ Невалиден (${botValidation.error})`;

  // Store validation result in session data
  sData.bot_valid = botValidation.ok;
  sData.bot_username = botValidation.bot_username || null;
  sData.bot_id = botValidation.bot_id || null;

  const text =
    `✅ <b>Проверь данные магазина:</b>\n\n` +
    `🏪 Название: <b>${esc(sData.name as string)}</b>\n` +
    `🎨 Цвет: ${colorName}\n` +
    `📌 Заголовок: ${esc(sData.hero_title as string || "—")}\n` +
    `📝 Описание: ${esc(sData.hero_desc as string || "—")}\n` +
    `👋 Приветствие: ${esc((sData.welcome as string || "—").slice(0, 80))}\n` +
    `🔗 Поддержка: ${esc(sData.support as string || "—")}\n` +
    `🤖 Бот: ${botStatusText}`;

  const kb = botValidation.ok
    ? ikb([
        [btn("✅ Всё верно", "p:confirm_create"), btn("✏️ Изменить", "p:wback:1")],
        [btn("❌ Отмена", "p:home")],
      ])
    : ikb([
        [btn("🔄 Ввести токен заново", "p:wback:7")],
        [btn("✅ Создать без бота", "p:confirm_create")],
        [btn("❌ Отмена", "p:home")],
      ]);

  await setSession(chatId, "wiz_confirm", sData);

  if (msgId) return tg.edit(chatId, msgId, text, kb);
  return tg.send(chatId, text, kb);
}

async function finalizeShop(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const session = await getSession(chatId);
  if (!session) return tg.edit(chatId, msgId, "❌ Сессия истекла", ikb([[btn("◀️ Меню", "p:home")]]));

  const sData = session.data as Record<string, unknown>;
  const { data: user } = await db().from("platform_users").select("id").eq("telegram_id", chatId).maybeSingle();
  if (!user) return;

  // Generate slug
  const name = sData.name as string;
  let slug = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || `shop-${Date.now()}`;
  const tr: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  slug = slug.split("").map(c => tr[c] || c).join("").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
  if (slug.length < 2) slug = `shop-${Date.now()}`;

  const { data: existing } = await db().from("shops").select("id").eq("slug", slug).maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  // Encrypt bot token if valid
  const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  let botTokenEnc: string | null = null;
  let botId: number | null = null;
  let botUsername: string | null = null;
  let webhookStatus = "none";

  if (sData.bot_token && sData.bot_valid && encKey) {
    const { data: enc, error: encErr } = await db().rpc("encrypt_token", { p_token: sData.bot_token as string, p_key: encKey });
    if (encErr) console.error("finalizeShop: encryption error", encErr);
    botTokenEnc = enc;
    botId = (sData.bot_id as number) || null;
    botUsername = (sData.bot_username as string) || null;
  }

  const { data: shop, error } = await db().from("shops").insert({
    name,
    slug,
    owner_id: user.id,
    status: "active",
    color: (sData.color as string) || "#2B7FFF",
    hero_title: (sData.hero_title as string) || "",
    hero_description: (sData.hero_desc as string) || "",
    welcome_message: (sData.welcome as string) || "",
    support_link: (sData.support as string) || "",
    bot_token_encrypted: botTokenEnc,
    bot_id: botId,
    bot_username: botUsername,
    webhook_status: webhookStatus,
  }).select("id, slug").single();

  if (error || !shop) {
    await clearSession(chatId);
    return tg.edit(chatId, msgId, `❌ Ошибка: ${error?.message || "unknown"}`, ikb([[btn("◀️ Меню", "p:home")]]));
  }

  // Set webhook for seller bot after shop is created
  let botStatusMsg = "";
  if (sData.bot_token && sData.bot_valid) {
    const whResult = await setupSellerWebhook(sData.bot_token as string, shop.id);
    await db().from("shops").update({
      webhook_status: whResult.ok ? "active" : "failed",
      bot_validated_at: new Date().toISOString(),
    }).eq("id", shop.id);
    botStatusMsg = whResult.ok
      ? `\n\n🤖 Бот @${botUsername} подключён и готов к работе!`
      : `\n\n⚠️ Бот @${botUsername} сохранён, но webhook не установлен: ${whResult.error}`;
  }

  await clearSession(chatId);

  const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
  const text =
    `🎉 <b>Магазин создан!</b>\n\n` +
    `Вот твоя ссылка:\n${esc(shopUrl)}${botStatusMsg}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("📋 Скопировать ссылку", `p:copylink:${shop.id}`)],
    [btn("📦 Как добавить товары", `p:howaddprod:${shop.id}`)],
    [btn("⚙️ Настройки", `p:settings:${shop.id}`)],
    [btn("◀️ Меню", "p:home")],
  ]));
}

// ═══════════════════════════════════════════════
// DELETE SHOP
// ═══════════════════════════════════════════════
async function deleteShopConfirm(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("name").eq("id", shopId).single();
  return tg.edit(chatId, msgId,
    `🗑 <b>Удаление магазина</b>\n\nВы уверены что хотите удалить <b>${esc(shop?.name || "")}</b>?\n\n⚠️ Это действие необратимо. Все товары и заказы будут удалены.`,
    ikb([
      [btn("🗑 Да, удалить", `p:confirmdelete:${shopId}`), btn("❌ Нет", `p:shop:${shopId}`)],
    ]),
  );
}

async function deleteShopExecute(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  // Clean up webhook before deletion
  const { data: shop } = await db().from("shops").select("bot_token_encrypted").eq("id", shopId).single();
  if (shop?.bot_token_encrypted) {
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (encKey) {
      try {
        const { data: rawToken } = await db().rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: encKey });
        if (rawToken) await removeSellerWebhook(rawToken);
      } catch {}
    }
  }

  // Delete related data
  const { data: products } = await db().from("shop_products").select("id").eq("shop_id", shopId);
  const prodIds = products?.map(p => p.id) || [];
  if (prodIds.length) {
    await db().from("shop_inventory").delete().in("product_id", prodIds);
    await db().from("shop_order_items").delete().in("product_id", prodIds);
  }
  await db().from("shop_products").delete().eq("shop_id", shopId);
  await db().from("shop_orders").delete().eq("shop_id", shopId);
  await db().from("shop_categories").delete().eq("shop_id", shopId);
  await db().from("shops").delete().eq("id", shopId);

  return tg.edit(chatId, msgId, "✅ Магазин удалён.", ikb([[btn("◀️ К магазинам", "p:myshops:0")]]));
}

// ═══════════════════════════════════════════════
// HOW TO ADD PRODUCTS
// ═══════════════════════════════════════════════
function howToAddProducts(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const text =
    `📦 <b>Как добавить товары</b>\n\n` +
    `1. Перейди в ⚙️ <b>Настройки</b> магазина\n` +
    `2. Управление товарами будет доступно через бот продавца\n` +
    `3. Загрузи инвентарь — каждая строка = 1 единица товара\n\n` +
    `💡 Товары появятся в твоём магазине автоматически!`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("⚙️ Настройки", `p:settings:${shopId}`)],
    [btn("◀️ К магазину", `p:shop:${shopId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// TEXT FSM HANDLER
// ═══════════════════════════════════════════════
async function handleText(tg: ReturnType<typeof TG>, chatId: number, text: string, from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  const session = await getSession(chatId);
  if (!session) return;

  const state = session.state;
  const sData = { ...(session.data || {}) } as Record<string, unknown>;
  const val = text.trim();

  // ─── Wizard steps ─────────────────────────
  if (state === "wiz_1") {
    if (val.length < 2 || val.length > 50) return tg.send(chatId, "❌ Название: от 2 до 50 символов. Попробуй ещё:");
    sData.name = val;
    return wizardStep(tg, chatId, 2, sData);
  }
  if (state === "wiz_2_custom") {
    if (!/^#?[0-9A-Fa-f]{6}$/.test(val)) return tg.send(chatId, "❌ Введи HEX цвет, например: #FF5500");
    sData.color = val.startsWith("#") ? val : `#${val}`;
    return wizardStep(tg, chatId, 3, sData);
  }
  if (state === "wiz_3") {
    if (val.length < 2 || val.length > 100) return tg.send(chatId, "❌ Заголовок: от 2 до 100 символов:");
    sData.hero_title = val;
    return wizardStep(tg, chatId, 4, sData);
  }
  if (state === "wiz_4") {
    if (val.length < 2 || val.length > 300) return tg.send(chatId, "❌ Описание: от 2 до 300 символов:");
    sData.hero_desc = val;
    return wizardStep(tg, chatId, 5, sData);
  }
  if (state === "wiz_5") {
    if (val.length < 2) return tg.send(chatId, "❌ Минимум 2 символа:");
    sData.welcome = val;
    return wizardStep(tg, chatId, 6, sData);
  }
  if (state === "wiz_6") {
    sData.support = val;
    return wizardStep(tg, chatId, 7, sData);
  }
  if (state === "wiz_7") {
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(val)) {
      return tg.send(chatId, "❌ Неверный формат токена. Скопируй токен из @BotFather:");
    }
    // Send "validating..." message
    await tg.send(chatId, "⏳ Проверяю токен...");
    sData.bot_token = val;
    return showConfirmation(tg, chatId, sData);
  }

  // ─── Edit shop field ──────────────────────
  if (state === "edit_field") {
    const shopId = sData.shop_id as string;
    const field = sData.field as string;
    const fieldMap: Record<string, string> = {
      name: "name", slug: "slug", welcome: "welcome_message",
      support: "support_link", color: "color",
      hero_title: "hero_title", hero_desc: "hero_description",
    };
    const dbField = fieldMap[field];
    if (!dbField) { await clearSession(chatId); return; }

    if (field === "color" && !/^#?[0-9A-Fa-f]{6}$/.test(val)) {
      return tg.send(chatId, "❌ Введи HEX цвет, например: #FF5500");
    }

    const updateVal = field === "color" ? (val.startsWith("#") ? val : `#${val}`) : val;
    await db().from("shops").update({ [dbField]: updateVal, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId);
    const resp = await tg.send(chatId, "✅ Обновлено!");
    const mid = resp?.result?.message_id;
    if (mid) return shopSettings(tg, chatId, mid, shopId);
    return;
  }

  // ─── Set bot token (from settings) ────────
  if (state === "set_bot_token") {
    const shopId = sData.shop_id as string;
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(val)) return tg.send(chatId, "❌ Неверный формат токена:");

    await tg.send(chatId, "⏳ Проверяю токен и устанавливаю webhook...");

    const result = await connectBotToken(val, shopId);
    await clearSession(chatId);

    return tg.send(chatId, result.message, ikb([[btn("◀️ К настройкам", `p:settings:${shopId}`)]]));
  }

  // ─── Set CryptoBot token ──────────────────
  if (state === "set_cryptobot_token") {
    const shopId = sData.shop_id as string;
    if (val.length < 10) return tg.send(chatId, "❌ Неверный формат:");
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encKey) return tg.send(chatId, "❌ Ошибка конфигурации.");
    const { data: enc } = await db().rpc("encrypt_token", { p_token: val, p_key: encKey });
    await db().from("shops").update({ cryptobot_token_encrypted: enc, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId);
    return tg.send(chatId, "✅ CryptoBot-токен сохранён!", ikb([[btn("◀️ К настройкам", `p:settings:${shopId}`)]]));
  }
}

// ═══════════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════════
async function handleCallback(tg: ReturnType<typeof TG>, chatId: number, msgId: number, data: string, cbId: string, from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  await tg.answer(cbId);
  const parts = data.split(":");
  const cmd = parts[1];

  // ─── Channel check ────────────────────────
  if (cmd === "checksub") {
    const ok = await checkAllChannels(tg, chatId);
    if (!ok) {
      return tg.edit(chatId, msgId,
        "❌ Ты ещё не подписался на все каналы.\nПодпишись и нажми кнопку снова.",
        ikb([...channelButtons()]),
      );
    }
    await upsertUser(from);
    await clearSession(chatId);
    await tg.deleteMessage(chatId, msgId);
    return sendWelcome(tg, chatId, from.first_name || "друг");
  }

  // ─── Home ─────────────────────────────────
  if (cmd === "home") {
    await clearSession(chatId);
    const text =
      `👋 <b>${esc(from.first_name || "")}</b>, ты в главном меню\n\n` +
      `Выбери действие:`;
    return tg.edit(chatId, msgId, text, ikb([
      [btn("🏪 Создать магазин", "p:create"), btn("📖 Как это работает", "p:howitworks")],
      [btn("👤 Мой профиль", "p:profile")],
      [btn("🏪 Мои магазины", "p:myshops:0")],
    ]));
  }

  if (cmd === "noop") return;
  if (cmd === "howitworks") return howItWorks(tg, chatId, msgId);
  if (cmd === "profile") return showProfile(tg, chatId, msgId);
  if (cmd === "sub") return showSubscription(tg, chatId, msgId);
  if (cmd === "myshops") return myShops(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "shop") return shopView(tg, chatId, msgId, parts[2]);
  if (cmd === "settings") return shopSettings(tg, chatId, msgId, parts[2]);
  if (cmd === "stats") return shopStats(tg, chatId, msgId, parts[2]);

  // ─── Create shop wizard ───────────────────
  if (cmd === "create") {
    return wizardStep(tg, chatId, 1, {}, msgId);
  }

  // Wizard color selection
  if (cmd === "wcolor") {
    const session = await getSession(chatId);
    if (!session) return;
    const sData = { ...(session.data || {}) } as Record<string, unknown>;
    const colorKey = parts[2];
    if (colorKey === "custom") {
      await setSession(chatId, "wiz_2_custom", sData);
      return tg.edit(chatId, msgId, "🎨 Введи HEX цвет, например: <code>#FF5500</code>", ikb([[btn("◀️ Назад", "p:wback:2")]]));
    }
    sData.color = COLORS[colorKey] || "#2B7FFF";
    return wizardStep(tg, chatId, 3, sData, msgId);
  }

  // Wizard back
  if (cmd === "wback") {
    const session = await getSession(chatId);
    const sData = session?.data ? { ...session.data } as Record<string, unknown> : {};
    const step = parseInt(parts[2]) || 1;
    return wizardStep(tg, chatId, step, sData, msgId);
  }

  // Confirm creation
  if (cmd === "confirm_create") {
    return finalizeShop(tg, chatId, msgId);
  }

  // ─── Copy link ────────────────────────────
  if (cmd === "copylink") {
    const shopId = parts[2];
    const { data: shop } = await db().from("shops").select("id").eq("id", shopId).single();
    if (shop) {
      const url = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
      await tg.send(chatId, `📋 Ссылка на магазин:\n\n<code>${esc(url)}</code>\n\nНажми на ссылку выше чтобы скопировать.`);
    }
    return;
  }

  // How to add products
  if (cmd === "howaddprod") return howToAddProducts(tg, chatId, msgId, parts[2]);

  // ─── Edit shop field ──────────────────────
  if (cmd === "edit") {
    const shopId = parts[2];
    const field = parts[3];
    const labels: Record<string, string> = {
      name: "📛 название магазина", color: "🎨 HEX цвет (например #FF5500)",
      hero_title: "📌 заголовок витрины", hero_desc: "📝 описание витрины",
      welcome: "👋 приветственное сообщение", support: "🔗 ссылку на поддержку",
    };
    await setSession(chatId, "edit_field", { shop_id: shopId, field });
    return tg.edit(chatId, msgId, `✏️ Введи новое ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `p:settings:${shopId}`)]]));
  }

  // ─── Set bot token ────────────────────────
  if (cmd === "setbot") {
    const shopId = parts[2];
    await setSession(chatId, "set_bot_token", { shop_id: shopId });
    return tg.edit(chatId, msgId,
      "🤖 <b>Подключение бота</b>\n\nОтправь токен своего бота от @BotFather:\n\n⚠️ Токен будет проверен через Telegram API, зашифрован и сохранён.\n✅ Webhook будет установлен автоматически.",
      ikb([[urlBtn("📖 Как получить токен", "https://core.telegram.org/bots/tutorial")], [btn("❌ Отмена", `p:settings:${shopId}`)]]),
    );
  }

  // ─── Set CryptoBot token ──────────────────
  if (cmd === "setcb") {
    const shopId = parts[2];
    await setSession(chatId, "set_cryptobot_token", { shop_id: shopId });
    return tg.edit(chatId, msgId,
      "💰 <b>Подключение CryptoBot</b>\n\nОтправь API-токен от @CryptoBot:\n\n⚠️ Токен будет зашифрован.",
      ikb([[btn("❌ Отмена", `p:settings:${shopId}`)]]),
    );
  }

  // Toggle shop
  if (cmd === "toggle") {
    const shopId = parts[2];
    const { data: shop } = await db().from("shops").select("status").eq("id", shopId).single();
    if (shop) {
      await db().from("shops").update({ status: shop.status === "active" ? "paused" : "active", updated_at: new Date().toISOString() }).eq("id", shopId);
    }
    return shopView(tg, chatId, msgId, shopId);
  }

  // Delete shop
  if (cmd === "delshop") return deleteShopConfirm(tg, chatId, msgId, parts[2]);
  if (cmd === "confirmdelete") return deleteShopExecute(tg, chatId, msgId, parts[2]);

  // Pay subscription (placeholder)
  if (cmd === "pay_sub") {
    return tg.edit(chatId, msgId, "💳 Оплата подписки будет доступна в ближайшее время.", ikb([[btn("◀️ Назад", "p:sub")]]));
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
      if (chatId && msgId && data && data.startsWith("p:")) {
        await handleCallback(tg, chatId, msgId, data, cb.id, cb.from);
      }
      return new Response("ok");
    }

    // ─── Text message ───────────────────────
    if (msg) {
      const chatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const from = msg.from;

      // ─── /start ───────────────────────────
      if (text === "/start" || text.startsWith("/start ")) {
        await upsertUser(from);
        await clearSession(chatId);
        await sendWelcome(tg, chatId, from.first_name || "друг");
        return new Response("ok");
      }

      // ─── /help ────────────────────────────
      if (text === "/help") {
        const resp = await tg.send(chatId, "⏳");
        const mid = resp?.result?.message_id;
        if (mid) {
          await howItWorks(tg, chatId, mid);
        }
        return new Response("ok");
      }

      // ─── Bottom panel buttons ─────────────
      if (text === "👤 Профиль") {
        await showProfile(tg, chatId);
        return new Response("ok");
      }
      if (text === "🆘 Поддержка") {
        await tg.send(chatId, `🆘 Свяжитесь с поддержкой:\n${SUPPORT_LINK}`, ikb([[urlBtn("🆘 Написать в поддержку", SUPPORT_LINK)]]));
        return new Response("ok");
      }
      if (text === "🏪 Мои магазины") {
        await myShops(tg, chatId);
        return new Response("ok");
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
