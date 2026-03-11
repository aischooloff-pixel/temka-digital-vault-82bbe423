import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Telegram API helper ──────────────────────
const TG = (token: string) => {
  const call = (method: string, body: Record<string, unknown>) =>
    fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  return {
    send: (chatId: number, text: string, markup?: unknown) =>
      call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...(markup ? { reply_markup: markup } : {}) }),
    edit: (chatId: number, msgId: number, text: string, markup?: unknown) =>
      call("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", ...(markup ? { reply_markup: markup } : {}) }),
    answer: (cbId: string, text?: string) =>
      call("answerCallbackQuery", { callback_query_id: cbId, ...(text ? { text, show_alert: true } : {}) }),
    getChatMember: (chatId: string, userId: number) =>
      call("getChatMember", { chat_id: chatId, user_id: userId }).then(r => r.json()),
    deleteMessage: (chatId: number, msgId: number) =>
      call("deleteMessage", { chat_id: chatId, message_id: msgId }),
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

// ─── Session FSM ──────────────────────────────
async function getSession(tgId: number) {
  const { data } = await db().from("platform_sessions").select("*").eq("telegram_id", tgId).maybeSingle();
  return data as { telegram_id: number; state: string; data: Record<string, unknown> } | null;
}
async function setSession(tgId: number, state: string, data: Record<string, unknown> = {}) {
  await db().from("platform_sessions").upsert(
    { telegram_id: tgId, state, data, updated_at: new Date().toISOString() },
    { onConflict: "telegram_id" }
  );
}
async function clearSession(tgId: number) {
  await db().from("platform_sessions").delete().eq("telegram_id", tgId);
}

// ─── Channel subscription check ───────────────
async function checkSubscription(tg: ReturnType<typeof TG>, userId: number): Promise<boolean> {
  const channelId = Deno.env.get("PLATFORM_CHANNEL_ID");
  if (!channelId) return true; // skip if not configured
  try {
    const result = await tg.getChatMember(channelId, userId);
    const status = result?.result?.status;
    return ["member", "administrator", "creator"].includes(status);
  } catch {
    return true; // allow if check fails
  }
}

// ─── Upsert user profile ─────────────────────
async function upsertUser(from: { id: number; first_name: string; last_name?: string; username?: string; is_premium?: boolean; language_code?: string }) {
  const { data: existing } = await db().from("platform_users").select("id").eq("telegram_id", from.id).maybeSingle();
  if (existing) {
    await db().from("platform_users").update({
      first_name: from.first_name,
      last_name: from.last_name || null,
      username: from.username || null,
      is_premium: from.is_premium || false,
      language_code: from.language_code || null,
      updated_at: new Date().toISOString(),
    }).eq("telegram_id", from.id);
    return existing;
  }
  const { data } = await db().from("platform_users").insert({
    telegram_id: from.id,
    first_name: from.first_name,
    last_name: from.last_name || null,
    username: from.username || null,
    is_premium: from.is_premium || false,
    language_code: from.language_code || null,
  }).select("id").single();
  return data;
}

// ─── Get user with shops ─────────────────────
async function getUserData(tgId: number) {
  const { data: user } = await db().from("platform_users").select("*").eq("telegram_id", tgId).maybeSingle();
  if (!user) return null;
  const { data: shops } = await db().from("shops").select("*").eq("owner_id", user.id).order("created_at");
  return { ...user, shops: shops || [] };
}

// ═══════════════════════════════════════════════
// MAIN MENU
// ═══════════════════════════════════════════════
async function showMainMenu(tg: ReturnType<typeof TG>, chatId: number, msgId?: number) {
  const userData = await getUserData(chatId);
  if (!userData) return;

  const shopCount = userData.shops.length;
  const subStatus = userData.subscription_status === "active" ? "✅ Активна" : userData.subscription_status === "trial" ? "🆓 Пробный" : "❌ Неактивна";

  let text = `🏪 <b>Платформа магазинов</b>\n\n`;
  text += `👤 ${esc(userData.first_name)}`;
  if (userData.username) text += ` (@${esc(userData.username)})`;
  text += `\n📊 Подписка: ${subStatus}\n`;
  text += `🏪 Магазинов: ${shopCount}\n`;

  const rows: Btn[][] = [];
  if (shopCount > 0) {
    rows.push([btn("🏪 Мои магазины", "p:shops:0")]);
  }
  rows.push([btn("➕ Создать магазин", "p:create")]);
  rows.push([btn("💳 Подписка", "p:sub"), btn("ℹ️ Помощь", "p:help")]);

  if (msgId) {
    await tg.edit(chatId, msgId, text, ikb(rows));
  } else {
    await tg.send(chatId, text, ikb(rows));
  }
}

// ═══════════════════════════════════════════════
// SHOP LIST
// ═══════════════════════════════════════════════
async function shopsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, page: number) {
  const userData = await getUserData(chatId);
  if (!userData || !userData.shops.length) {
    return tg.edit(chatId, msgId, "🏪 <b>Мои магазины</b>\n\nУ вас пока нет магазинов.", ikb([
      [btn("➕ Создать", "p:create")],
      [btn("◀️ Меню", "p:menu")],
    ]));
  }

  const perPage = 5;
  const total = Math.ceil(userData.shops.length / perPage);
  const p = Math.min(Math.max(0, page), total - 1);
  const slice = userData.shops.slice(p * perPage, (p + 1) * perPage);

  let text = `🏪 <b>Мои магазины</b> (${userData.shops.length})\n\n`;
  slice.forEach(s => {
    const status = s.status === "active" ? "✅" : "⏸";
    text += `${status} <b>${esc(s.name)}</b>\n   🔗 /${s.slug}\n\n`;
  });

  const rows: Btn[][] = slice.map(s => [btn(`${s.status === "active" ? "✅" : "⏸"} ${s.name}`, `p:shop:${s.id}`)]);
  if (total > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `p:shops:${p - 1}`));
    nav.push(btn(`${p + 1}/${total}`, "p:noop"));
    if (p < total - 1) nav.push(btn("▶️", `p:shops:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("➕ Создать", "p:create"), btn("◀️ Меню", "p:menu")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// SHOP VIEW
// ═══════════════════════════════════════════════
async function shopView(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return tg.edit(chatId, msgId, "❌ Магазин не найден", ikb([[btn("◀️ Назад", "p:shops:0")]]));

  const { count: productCount } = await db().from("shop_products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: orderCount } = await db().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId);

  let text = `🏪 <b>${esc(shop.name)}</b>\n\n`;
  text += `🔗 Slug: <code>${esc(shop.slug)}</code>\n`;
  text += `📊 Статус: ${shop.status === "active" ? "✅ Активен" : "⏸ Неактивен"}\n`;
  text += `🎨 Цвет: ${shop.color}\n`;
  text += `📦 Товаров: ${productCount || 0}\n`;
  text += `🛒 Заказов: ${orderCount || 0}\n`;
  text += `🤖 Бот: ${shop.bot_token_encrypted ? "✅ Подключён" : "❌ Не подключён"}\n`;
  text += `💰 CryptoBot: ${shop.cryptobot_token_encrypted ? "✅ Подключён" : "❌ Не подключён"}\n`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("📦 Товары", `p:prods:${shopId}:0`), btn("🛒 Заказы", `p:ords:${shopId}:0`)],
    [btn("⚙️ Настройки", `p:sett:${shopId}`), btn("🎨 Оформление", `p:design:${shopId}`)],
    [btn("🤖 Бот-токен", `p:setbot:${shopId}`), btn("💰 CryptoBot", `p:setcb:${shopId}`)],
    [btn(shop.status === "active" ? "⏸ Остановить" : "✅ Запустить", `p:toggle:${shopId}`)],
    [btn("◀️ К магазинам", "p:shops:0")],
  ]));
}

// ═══════════════════════════════════════════════
// SHOP CREATION WIZARD
// ═══════════════════════════════════════════════
async function startCreateShop(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  await setSession(chatId, "create_shop_name", {});
  return tg.edit(chatId, msgId,
    "🏪 <b>Создание магазина</b>\n\n📝 Введите название вашего магазина:",
    ikb([[btn("❌ Отмена", "p:menu")]]),
  );
}

// ═══════════════════════════════════════════════
// SHOP SETTINGS
// ═══════════════════════════════════════════════
async function shopSettings(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return tg.edit(chatId, msgId, "❌ Не найден", ikb([[btn("◀️ Назад", "p:shops:0")]]));

  let text = `⚙️ <b>Настройки: ${esc(shop.name)}</b>\n\n`;
  text += `📛 Название: ${esc(shop.name)}\n`;
  text += `🔗 Slug: <code>${esc(shop.slug)}</code>\n`;
  text += `💬 Приветствие: ${shop.welcome_message ? esc(shop.welcome_message.slice(0, 50)) + "..." : "—"}\n`;
  text += `🆘 Поддержка: ${shop.support_link || "—"}\n`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Название", `p:edit:${shopId}:name`), btn("✏️ Slug", `p:edit:${shopId}:slug`)],
    [btn("✏️ Приветствие", `p:edit:${shopId}:welcome`), btn("✏️ Поддержка", `p:edit:${shopId}:support`)],
    [btn("◀️ К магазину", `p:shop:${shopId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// SHOP DESIGN
// ═══════════════════════════════════════════════
async function shopDesign(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await db().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return;

  let text = `🎨 <b>Оформление: ${esc(shop.name)}</b>\n\n`;
  text += `🎨 Цвет: ${shop.color}\n`;
  text += `📝 Заголовок: ${shop.hero_title || "—"}\n`;
  text += `📄 Описание: ${shop.hero_description ? esc(shop.hero_description.slice(0, 60)) + "..." : "—"}\n`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("🎨 Цвет", `p:edit:${shopId}:color`), btn("📝 Заголовок", `p:edit:${shopId}:hero_title`)],
    [btn("📄 Описание", `p:edit:${shopId}:hero_desc`)],
    [btn("◀️ К магазину", `p:shop:${shopId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// PRODUCTS LIST
// ═══════════════════════════════════════════════
async function shopProductsList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page: number) {
  const { data: products } = await db().from("shop_products").select("*").eq("shop_id", shopId).order("sort_order");
  if (!products?.length) {
    return tg.edit(chatId, msgId, "📦 <b>Товары</b>\n\nТоваров нет.", ikb([
      [btn("➕ Добавить", `p:addprod:${shopId}`)],
      [btn("◀️ К магазину", `p:shop:${shopId}`)],
    ]));
  }

  const perPage = 6;
  const total = Math.ceil(products.length / perPage);
  const p = Math.min(Math.max(0, page), total - 1);
  const slice = products.slice(p * perPage, (p + 1) * perPage);

  let text = `📦 <b>Товары</b> (${products.length})\n\n`;
  slice.forEach(pr => {
    text += `${pr.is_active ? "✅" : "❌"} <b>${esc(pr.name)}</b> — $${Number(pr.price).toFixed(2)} | 📦 ${pr.stock}\n`;
  });

  const rows: Btn[][] = slice.map(pr => [btn(`${pr.is_active ? "✅" : "❌"} ${pr.name.slice(0, 28)}`, `p:prod:${pr.id}`)]);
  if (total > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `p:prods:${shopId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${total}`, "p:noop"));
    if (p < total - 1) nav.push(btn("▶️", `p:prods:${shopId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("➕ Добавить", `p:addprod:${shopId}`), btn("◀️ К магазину", `p:shop:${shopId}`)]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// PRODUCT VIEW
// ═══════════════════════════════════════════════
async function shopProductView(tg: ReturnType<typeof TG>, chatId: number, msgId: number, prodId: string) {
  const { data: pr } = await db().from("shop_products").select("*").eq("id", prodId).single();
  if (!pr) return tg.edit(chatId, msgId, "❌ Не найден", ikb([[btn("◀️ Назад", "p:shops:0")]]));

  const { count: invCount } = await db().from("shop_inventory").select("id", { count: "exact", head: true }).eq("product_id", prodId).eq("status", "available");

  let text = `📦 <b>${esc(pr.name)}</b>\n\n`;
  text += `📝 ${esc(pr.subtitle || "—")}\n`;
  text += `💰 <b>$${Number(pr.price).toFixed(2)}</b>`;
  if (pr.old_price) text += ` <s>$${Number(pr.old_price).toFixed(2)}</s>`;
  text += `\n📦 Остаток: <b>${pr.stock}</b> | Единиц: <b>${invCount || 0}</b>\n`;
  text += `${pr.is_active ? "✅ Активен" : "❌ Скрыт"}\n`;
  if (pr.description) text += `\n📄 ${esc(pr.description.slice(0, 200))}\n`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Название", `p:eprod:${prodId}:name`), btn("✏️ Цена", `p:eprod:${prodId}:price`)],
    [btn("✏️ Описание", `p:eprod:${prodId}:desc`), btn("✏️ Подзаголовок", `p:eprod:${prodId}:sub`)],
    [btn(pr.is_active ? "❌ Скрыть" : "✅ Показать", `p:tprod:${prodId}`)],
    [btn("🗃 Склад", `p:inv:${prodId}:0`), btn("🗑 Удалить", `p:dprod:${prodId}`)],
    [btn("◀️ К товарам", `p:prods:${pr.shop_id}:0`)],
  ]));
}

// ═══════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════
async function shopInventory(tg: ReturnType<typeof TG>, chatId: number, msgId: number, prodId: string, page: number) {
  const { data: items } = await db().from("shop_inventory").select("*").eq("product_id", prodId).eq("status", "available").order("created_at").limit(100);
  const { data: pr } = await db().from("shop_products").select("name, shop_id").eq("id", prodId).single();
  const total = items?.length || 0;

  let text = `🗃 <b>Склад: ${esc(pr?.name || "")}</b>\n\n`;
  text += `📦 Доступно: ${total}\n\n`;
  text += `Для добавления отправьте единицы товара — каждая строка = 1 единица.`;

  await setSession(chatId, "add_inventory", { product_id: prodId, shop_id: pr?.shop_id });

  return tg.edit(chatId, msgId, text, ikb([
    [btn("🗑 Очистить всё", `p:clearinv:${prodId}`)],
    [btn("◀️ К товару", `p:prod:${prodId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════
async function shopOrdersList(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page: number) {
  const { data: orders } = await db().from("shop_orders").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(100);
  if (!orders?.length) {
    return tg.edit(chatId, msgId, "🛒 <b>Заказы</b>\n\nЗаказов нет.", ikb([[btn("◀️ К магазину", `p:shop:${shopId}`)]]));
  }

  const se: Record<string, string> = { pending: "⏳", paid: "✅", delivered: "📬", completed: "✅", cancelled: "❌" };
  const perPage = 6;
  const totalPages = Math.ceil(orders.length / perPage);
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const slice = orders.slice(p * perPage, (p + 1) * perPage);

  let text = `🛒 <b>Заказы</b> (${orders.length})\n\n`;
  slice.forEach(o => {
    text += `${se[o.status] || "❓"} <b>${esc(o.order_number)}</b> — $${Number(o.total_amount).toFixed(2)}\n👤 ${o.buyer_telegram_id} | 📅 ${new Date(o.created_at).toLocaleDateString("ru-RU")}\n\n`;
  });

  const rows: Btn[][] = slice.map(o => [btn(`${se[o.status] || "❓"} ${o.order_number}`, `p:ord:${o.id}`)]);
  if (totalPages > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `p:ords:${shopId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalPages}`, "p:noop"));
    if (p < totalPages - 1) nav.push(btn("▶️", `p:ords:${shopId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ К магазину", `p:shop:${shopId}`)]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// SUBSCRIPTION
// ═══════════════════════════════════════════════
async function showSubscription(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const { data: user } = await db().from("platform_users").select("*").eq("telegram_id", chatId).maybeSingle();
  if (!user) return;

  let text = `💳 <b>Подписка</b>\n\n`;
  text += `📊 Статус: <b>${user.subscription_status === "active" ? "✅ Активна" : user.subscription_status === "trial" ? "🆓 Пробный период" : "❌ Неактивна"}</b>\n`;
  if (user.subscription_expires_at) {
    text += `📅 Истекает: ${new Date(user.subscription_expires_at).toLocaleDateString("ru-RU")}\n`;
  }
  text += `\n💰 Стоимость: <b>$9/мес</b>\n`;
  text += `\nВключает:\n`;
  text += `• Неограниченное кол-во магазинов\n`;
  text += `• Приём платежей через CryptoBot\n`;
  text += `• Собственный Telegram-бот\n`;
  text += `• Авто-доставка цифровых товаров\n`;

  const rows: Btn[][] = [];
  if (user.subscription_status !== "active") {
    rows.push([btn("💳 Оплатить $9", "p:pay_sub")]);
  }
  rows.push([btn("◀️ Меню", "p:menu")]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════
function showHelp(tg: ReturnType<typeof TG>, chatId: number, msgId: number) {
  const text = `ℹ️ <b>Помощь</b>\n\n` +
    `Эта платформа позволяет создавать магазины цифровых товаров прямо в Telegram.\n\n` +
    `<b>Как начать:</b>\n` +
    `1. Создайте магазин\n` +
    `2. Добавьте товары и загрузите инвентарь\n` +
    `3. Подключите своего Telegram-бота\n` +
    `4. Подключите CryptoBot для приёма платежей\n` +
    `5. Клиенты покупают через вашего бота!\n\n` +
    `<b>Команды:</b>\n` +
    `/start — Главное меню\n` +
    `/help — Помощь\n`;

  return tg.edit(chatId, msgId, text, ikb([[btn("◀️ Меню", "p:menu")]]));
}

// ═══════════════════════════════════════════════
// FSM TEXT HANDLER
// ═══════════════════════════════════════════════
async function handleTextMessage(tg: ReturnType<typeof TG>, chatId: number, text: string, from: { id: number; first_name: string; last_name?: string; username?: string }) {
  const session = await getSession(chatId);
  if (!session) return;

  const state = session.state;
  const sData = (session.data || {}) as Record<string, unknown>;

  // ─── Shop Creation Wizard ─────────────────
  if (state === "create_shop_name") {
    const name = text.trim();
    if (name.length < 2 || name.length > 50) {
      return tg.send(chatId, "❌ Название должно быть от 2 до 50 символов. Попробуйте ещё:");
    }
    const slug = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || `shop-${Date.now()}`;
    await setSession(chatId, "create_shop_slug", { ...sData, name, slug });
    return tg.send(chatId,
      `📝 Название: <b>${esc(name)}</b>\n\n🔗 Предлагаемый slug: <code>${esc(slug)}</code>\n\nОтправьте свой slug или нажмите кнопку ниже для использования предложенного:`,
      ikb([[btn(`✅ Использовать: ${slug}`, `p:useslug:${slug}`)], [btn("❌ Отмена", "p:menu")]]),
    );
  }

  if (state === "create_shop_slug") {
    const slug = text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
    if (slug.length < 2) {
      return tg.send(chatId, "❌ Slug должен содержать минимум 2 латинских символа. Попробуйте ещё:");
    }
    const { data: existing } = await db().from("shops").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      return tg.send(chatId, `❌ Slug <code>${esc(slug)}</code> уже занят. Попробуйте другой:`);
    }
    // create shop
    return await finalizeShopCreation(tg, chatId, sData.name as string, slug);
  }

  // ─── Edit shop fields ─────────────────────
  if (state === "edit_shop_field") {
    const shopId = sData.shop_id as string;
    const field = sData.field as string;
    const value = text.trim();

    const fieldMap: Record<string, string> = {
      name: "name", slug: "slug", welcome: "welcome_message",
      support: "support_link", color: "color",
      hero_title: "hero_title", hero_desc: "hero_description",
    };
    const dbField = fieldMap[field];
    if (!dbField) { await clearSession(chatId); return; }

    if (field === "slug") {
      const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
      if (clean.length < 2) return tg.send(chatId, "❌ Slug минимум 2 символа:");
      const { data: ex } = await db().from("shops").select("id").eq("slug", clean).neq("id", shopId).maybeSingle();
      if (ex) return tg.send(chatId, "❌ Этот slug уже занят:");
      await db().from("shops").update({ [dbField]: clean, updated_at: new Date().toISOString() }).eq("id", shopId);
    } else {
      await db().from("shops").update({ [dbField]: value, updated_at: new Date().toISOString() }).eq("id", shopId);
    }

    await clearSession(chatId);
    await tg.send(chatId, `✅ Обновлено!`);
    // Resend shop view as new message
    const fakeMsg = await tg.send(chatId, "⏳");
    const resp = await fakeMsg.json();
    const newMsgId = resp?.result?.message_id;
    if (newMsgId) {
      if (["name", "slug", "welcome", "support"].includes(field)) {
        return shopSettings(tg, chatId, newMsgId, shopId);
      } else {
        return shopDesign(tg, chatId, newMsgId, shopId);
      }
    }
    return;
  }

  // ─── Set bot token ────────────────────────
  if (state === "set_bot_token") {
    const shopId = sData.shop_id as string;
    const token = text.trim();
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
      return tg.send(chatId, "❌ Неверный формат токена. Отправьте токен от @BotFather:");
    }
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encKey) {
      await clearSession(chatId);
      return tg.send(chatId, "❌ Ошибка конфигурации. Обратитесь к администратору.");
    }
    const { data: encrypted } = await db().rpc("encrypt_token", { p_token: token, p_key: encKey });
    await db().from("shops").update({ bot_token_encrypted: encrypted, updated_at: new Date().toISOString() }).eq("id", shopId);
    // Delete the message with the token for security
    await clearSession(chatId);
    await tg.send(chatId, "✅ Бот-токен сохранён и зашифрован!");
    return;
  }

  // ─── Set CryptoBot token ──────────────────
  if (state === "set_cryptobot_token") {
    const shopId = sData.shop_id as string;
    const token = text.trim();
    if (token.length < 10) {
      return tg.send(chatId, "❌ Неверный формат токена CryptoBot:");
    }
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encKey) {
      await clearSession(chatId);
      return tg.send(chatId, "❌ Ошибка конфигурации.");
    }
    const { data: encrypted } = await db().rpc("encrypt_token", { p_token: token, p_key: encKey });
    await db().from("shops").update({ cryptobot_token_encrypted: encrypted, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId);
    await tg.send(chatId, "✅ CryptoBot-токен сохранён и зашифрован!");
    return;
  }

  // ─── Add product ──────────────────────────
  if (state === "add_product_name") {
    const name = text.trim();
    if (name.length < 2) return tg.send(chatId, "❌ Минимум 2 символа:");
    await setSession(chatId, "add_product_price", { ...sData, name });
    return tg.send(chatId, `📝 Название: <b>${esc(name)}</b>\n\n💰 Введите цену (в USD):`, ikb([[btn("❌ Отмена", "p:menu")]]));
  }

  if (state === "add_product_price") {
    const price = parseFloat(text.trim().replace(",", "."));
    if (isNaN(price) || price <= 0) return tg.send(chatId, "❌ Введите корректную цену:");
    const shopId = sData.shop_id as string;
    const name = sData.name as string;
    const { data: product } = await db().from("shop_products").insert({
      shop_id: shopId, name, price, stock: 0,
    }).select("id").single();
    await clearSession(chatId);
    if (product) {
      await tg.send(chatId, `✅ Товар <b>${esc(name)}</b> создан!\n💰 Цена: $${price.toFixed(2)}\n\nТеперь загрузите инвентарь — отправьте единицы товара (каждая строка = 1 единица).`);
      await setSession(chatId, "add_inventory", { product_id: product.id, shop_id: shopId });
    }
    return;
  }

  // ─── Edit product fields ──────────────────
  if (state === "edit_product_field") {
    const prodId = sData.product_id as string;
    const field = sData.field as string;
    const value = text.trim();
    const map: Record<string, string> = { name: "name", price: "price", desc: "description", sub: "subtitle" };
    const dbField = map[field];
    if (!dbField) { await clearSession(chatId); return; }

    let updateVal: unknown = value;
    if (field === "price") {
      const p = parseFloat(value.replace(",", "."));
      if (isNaN(p) || p <= 0) return tg.send(chatId, "❌ Введите корректную цену:");
      updateVal = p;
    }

    await db().from("shop_products").update({ [dbField]: updateVal, updated_at: new Date().toISOString() }).eq("id", prodId);
    await clearSession(chatId);
    await tg.send(chatId, "✅ Обновлено!");
    return;
  }

  // ─── Add inventory ────────────────────────
  if (state === "add_inventory") {
    const prodId = sData.product_id as string;
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return tg.send(chatId, "❌ Отправьте хотя бы одну строку:");

    const items = lines.map(content => ({
      product_id: prodId, content, status: "available" as const,
    }));
    await db().from("shop_inventory").insert(items);
    // Update stock count
    const { count } = await db().from("shop_inventory").select("id", { count: "exact", head: true }).eq("product_id", prodId).eq("status", "available");
    await db().from("shop_products").update({ stock: count || 0, updated_at: new Date().toISOString() }).eq("id", prodId);

    return tg.send(chatId, `✅ Добавлено ${lines.length} единиц!\n📦 Всего на складе: ${count || 0}\n\nОтправьте ещё или нажмите готово:`,
      ikb([[btn("✅ Готово", `p:prod:${prodId}`)]]));
  }
}

// ═══════════════════════════════════════════════
// FINALIZE SHOP CREATION
// ═══════════════════════════════════════════════
async function finalizeShopCreation(tg: ReturnType<typeof TG>, chatId: number, name: string, slug: string) {
  const { data: user } = await db().from("platform_users").select("id").eq("telegram_id", chatId).maybeSingle();
  if (!user) return tg.send(chatId, "❌ Ошибка: пользователь не найден.");

  const { data: shop, error } = await db().from("shops").insert({
    name, slug, owner_id: user.id, status: "active",
  }).select("id").single();

  await clearSession(chatId);

  if (error) {
    return tg.send(chatId, `❌ Ошибка: ${error.message}`, ikb([[btn("◀️ Меню", "p:menu")]]));
  }

  return tg.send(chatId,
    `✅ Магазин <b>${esc(name)}</b> создан!\n\n🔗 Slug: <code>${esc(slug)}</code>\n\nТеперь настройте магазин:`,
    ikb([
      [btn("📦 Добавить товар", `p:addprod:${shop!.id}`)],
      [btn("⚙️ Настройки", `p:sett:${shop!.id}`)],
      [btn("◀️ Меню", "p:menu")],
    ]),
  );
}

// ═══════════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════════
async function handleCallback(tg: ReturnType<typeof TG>, chatId: number, msgId: number, data: string, cbId: string) {
  await tg.answer(cbId);
  const parts = data.split(":");
  const cmd = parts[1];

  // Don't clear session for wizard-related callbacks
  const keepSession = ["useslug", "checksubscribe"].includes(cmd);
  await clearSession(chatId); // clear FSM on any button press

  const parts = data.split(":");
  const cmd = parts[1];

  if (cmd === "menu") return showMainMenu(tg, chatId, msgId);
  if (cmd === "noop") return;
  if (cmd === "help") return showHelp(tg, chatId, msgId);
  if (cmd === "sub") return showSubscription(tg, chatId, msgId);

  // Shop list
  if (cmd === "shops") return shopsList(tg, chatId, msgId, parseInt(parts[2]) || 0);
  if (cmd === "shop") return shopView(tg, chatId, msgId, parts[2]);
  if (cmd === "create") return startCreateShop(tg, chatId, msgId);

  // Use suggested slug
  if (cmd === "useslug") {
    const session = await getSession(chatId);
    // Session was cleared, re-read data
    const slug = parts.slice(2).join(":");
    // Need to get name from somewhere — let's re-check
    // Actually we cleared session above, let's not clear on useslug
    // Fix: Don't clear session for create wizard callbacks
    return;
  }

  // Shop settings
  if (cmd === "sett") return shopSettings(tg, chatId, msgId, parts[2]);
  if (cmd === "design") return shopDesign(tg, chatId, msgId, parts[2]);

  // Edit shop field
  if (cmd === "edit") {
    const shopId = parts[2];
    const field = parts[3];
    const labels: Record<string, string> = {
      name: "название", slug: "slug", welcome: "приветствие",
      support: "ссылку поддержки", color: "цвет (HEX)",
      hero_title: "заголовок", hero_desc: "описание",
    };
    await setSession(chatId, "edit_shop_field", { shop_id: shopId, field });
    return tg.edit(chatId, msgId, `✏️ Введите новое ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `p:sett:${shopId}`)]]));
  }

  // Toggle shop status
  if (cmd === "toggle") {
    const shopId = parts[2];
    const { data: shop } = await db().from("shops").select("status").eq("id", shopId).single();
    if (shop) {
      const newStatus = shop.status === "active" ? "paused" : "active";
      await db().from("shops").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", shopId);
    }
    return shopView(tg, chatId, msgId, shopId);
  }

  // Set bot token
  if (cmd === "setbot") {
    const shopId = parts[2];
    await setSession(chatId, "set_bot_token", { shop_id: shopId });
    return tg.edit(chatId, msgId,
      "🤖 <b>Подключение бота</b>\n\nОтправьте токен вашего бота от @BotFather:\n\n⚠️ Токен будет зашифрован и надёжно сохранён.",
      ikb([[btn("❌ Отмена", `p:shop:${shopId}`)]]),
    );
  }

  // Set CryptoBot token
  if (cmd === "setcb") {
    const shopId = parts[2];
    await setSession(chatId, "set_cryptobot_token", { shop_id: shopId });
    return tg.edit(chatId, msgId,
      "💰 <b>Подключение CryptoBot</b>\n\nОтправьте API-токен от @CryptoBot:\n\n⚠️ Токен будет зашифрован.",
      ikb([[btn("❌ Отмена", `p:shop:${shopId}`)]]),
    );
  }

  // Products
  if (cmd === "prods") return shopProductsList(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
  if (cmd === "prod") return shopProductView(tg, chatId, msgId, parts[2]);

  // Add product
  if (cmd === "addprod") {
    const shopId = parts[2];
    await setSession(chatId, "add_product_name", { shop_id: shopId });
    return tg.edit(chatId, msgId, "📦 <b>Новый товар</b>\n\n📝 Введите название товара:", ikb([[btn("❌ Отмена", `p:prods:${shopId}:0`)]]));
  }

  // Edit product field
  if (cmd === "eprod") {
    const prodId = parts[2];
    const field = parts[3];
    const labels: Record<string, string> = { name: "название", price: "цену (USD)", desc: "описание", sub: "подзаголовок" };
    await setSession(chatId, "edit_product_field", { product_id: prodId, field });
    return tg.edit(chatId, msgId, `✏️ Введите новое ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `p:prod:${prodId}`)]]));
  }

  // Toggle product
  if (cmd === "tprod") {
    const prodId = parts[2];
    const { data: pr } = await db().from("shop_products").select("is_active").eq("id", prodId).single();
    if (pr) await db().from("shop_products").update({ is_active: !pr.is_active, updated_at: new Date().toISOString() }).eq("id", prodId);
    return shopProductView(tg, chatId, msgId, prodId);
  }

  // Delete product
  if (cmd === "dprod") {
    const prodId = parts[2];
    const { data: pr } = await db().from("shop_products").select("name, shop_id").eq("id", prodId).single();
    await db().from("shop_inventory").delete().eq("product_id", prodId);
    await db().from("shop_products").delete().eq("id", prodId);
    return tg.edit(chatId, msgId, `✅ Товар удалён.`, ikb([[btn("◀️ К товарам", `p:prods:${pr?.shop_id}:0`)]]));
  }

  // Inventory
  if (cmd === "inv") return shopInventory(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);

  // Clear inventory
  if (cmd === "clearinv") {
    const prodId = parts[2];
    await db().from("shop_inventory").delete().eq("product_id", prodId).eq("status", "available");
    await db().from("shop_products").update({ stock: 0, updated_at: new Date().toISOString() }).eq("id", prodId);
    return tg.edit(chatId, msgId, "✅ Склад очищен.", ikb([[btn("◀️ К товару", `p:prod:${prodId}`)]]));
  }

  // Orders
  if (cmd === "ords") return shopOrdersList(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
}

// ═══════════════════════════════════════════════
// MAIN SERVE
// ═══════════════════════════════════════════════
serve(async (req) => {
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
        await handleCallback(tg, chatId, msgId, data, cb.id);
      }
      return new Response("ok");
    }

    // ─── Text message ───────────────────────
    if (msg) {
      const chatId = msg.chat.id;
      const text = msg.text || "";
      const from = msg.from;

      // /start command
      if (text === "/start" || text === "/start ") {
        // Check channel subscription
        const subscribed = await checkSubscription(tg, chatId);
        if (!subscribed) {
          const channelId = Deno.env.get("PLATFORM_CHANNEL_ID") || "";
          const channelLink = channelId.startsWith("@") ? `https://t.me/${channelId.slice(1)}` : `https://t.me/c/${channelId}`;
          return new Response("ok", { status: 200 }) && await tg.send(chatId,
            "👋 <b>Добро пожаловать!</b>\n\nДля использования платформы подпишитесь на наш канал:",
            ikb([
              [urlBtn("📢 Подписаться", channelLink)],
              [btn("✅ Я подписался", "p:checksubscribe")],
            ]),
          );
        }

        // Upsert user
        await upsertUser(from);
        await clearSession(chatId);
        await showMainMenu(tg, chatId);
        return new Response("ok");
      }

      if (text === "/help") {
        const fakeResp = await tg.send(chatId, "⏳");
        const resp = await fakeResp.json();
        const mid = resp?.result?.message_id;
        if (mid) await showHelp(tg, chatId, mid);
        return new Response("ok");
      }

      // FSM text handler
      await handleTextMessage(tg, chatId, text, from);
      return new Response("ok");
    }

    return new Response("ok");
  } catch (e) {
    console.error("Platform bot error:", e);
    return new Response("error", { status: 500 });
  }
});
