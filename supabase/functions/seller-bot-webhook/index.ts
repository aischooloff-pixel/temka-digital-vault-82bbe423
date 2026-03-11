import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    deleteMessage: (chatId: number, msgId: number) =>
      call("deleteMessage", { chat_id: chatId, message_id: msgId }).catch(() => {}),
  };
};

type Btn = { text: string; callback_data?: string; url?: string; web_app?: { url: string } };
const btn = (t: string, cb: string): Btn => ({ text: t, callback_data: cb });
const urlBtn = (t: string, url: string): Btn => ({ text: t, url });
const ikb = (rows: Btn[][]) => ({ inline_keyboard: rows });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const WEBAPP_DOMAIN = Deno.env.get("WEBAPP_URL") || "https://temka-digital-vault.lovable.app";

// ─── Session FSM (reuse platform_sessions keyed by tg id) ──
// We prefix seller bot sessions with shop_id to avoid conflicts with platform bot
async function getSession(tgId: number, shopId: string) {
  // Use a composite key approach: store in platform_sessions with state prefix
  const { data } = await supabase().from("platform_sessions").select("*").eq("telegram_id", tgId).maybeSingle();
  if (!data) return null;
  // Only return if session belongs to this shop context
  const d = data.data as Record<string, unknown> | null;
  if (d && d._shop_id === shopId) return data as { telegram_id: number; state: string; data: Record<string, unknown> };
  return null;
}
async function setSession(tgId: number, state: string, shopId: string, data: Record<string, unknown> = {}) {
  await supabase().from("platform_sessions").upsert(
    { telegram_id: tgId, state, data: { ...data, _shop_id: shopId }, updated_at: new Date().toISOString() },
    { onConflict: "telegram_id" },
  );
}
async function clearSession(tgId: number) {
  await supabase().from("platform_sessions").delete().eq("telegram_id", tgId);
}

// ─── Check if user is shop owner ─────────────
async function isShopOwner(shopId: string, telegramId: number): Promise<boolean> {
  const { data: shop } = await supabase().from("shops").select("owner_id").eq("id", shopId).single();
  if (!shop) return false;
  const { data: user } = await supabase().from("platform_users").select("id").eq("telegram_id", telegramId).maybeSingle();
  if (!user) return false;
  return shop.owner_id === user.id;
}

// ═══════════════════════════════════════════════
// ADMIN HOME
// ═══════════════════════════════════════════════
async function adminHome(tg: ReturnType<typeof TG>, chatId: number, shopId: string, msgId?: number) {
  const { data: shop } = await supabase().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return;

  const { count: productCount } = await supabase().from("shop_products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: orderCount } = await supabase().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: categoryCount } = await supabase().from("shop_categories").select("id", { count: "exact", head: true }).eq("shop_id", shopId);

  const statusEmoji = shop.status === "active" ? "🟢" : "🔴";

  const text =
    `🔧 <b>Админ-панель: ${esc(shop.name)}</b>\n\n` +
    `📊 Статус: ${shop.status === "active" ? "активен" : "остановлен"} ${statusEmoji}\n` +
    `📦 Товаров: ${productCount || 0}\n` +
    `📂 Категорий: ${categoryCount || 0}\n` +
    `🛍 Заказов: ${orderCount || 0}`;

  const kb = ikb([
    [btn("📦 Товары", `s:products:${shopId}:0`), btn("📂 Категории", `s:cats:${shopId}:0`)],
    [btn("🗃 Инвентарь", `s:inv:${shopId}:0`), btn("📊 Статистика", `s:stats:${shopId}`)],
    [btn("⚙️ Настройки", `s:settings:${shopId}`), btn("⭐ Отзывы", `s:reviews:${shopId}:0`)],
    [btn("📢 Рассылка", `s:broadcast:${shopId}`), btn("🏷 Промокоды", `s:promos:${shopId}:0`)],
  ]);

  if (msgId) return tg.edit(chatId, msgId, text, kb);
  return tg.send(chatId, text, kb);
}

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════
async function shopSettings(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await supabase().from("shops").select("*").eq("id", shopId).single();
  if (!shop) return;

  let botStatus = "❌ не подключён";
  if (shop.bot_token_encrypted) {
    if (shop.bot_username && shop.webhook_status === "active") {
      botStatus = `✅ @${shop.bot_username} (webhook активен)`;
    } else if (shop.bot_username) {
      botStatus = `⚠️ @${shop.bot_username} (webhook: ${shop.webhook_status})`;
    } else {
      botStatus = "⚠️ токен сохранён";
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
    [btn("✏️ Название", `s:edit:${shopId}:name`), btn("🎨 Цвет", `s:edit:${shopId}:color`)],
    [btn("📌 Заголовок витрины", `s:edit:${shopId}:hero_title`)],
    [btn("📝 Описание витрины", `s:edit:${shopId}:hero_desc`)],
    [btn("👋 Приветствие", `s:edit:${shopId}:welcome`), btn("🔗 Поддержка", `s:edit:${shopId}:support`)],
    [btn("💰 CryptoBot", `s:setcb:${shopId}`)],
    [btn("◀️ Админ-панель", `s:home:${shopId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════
async function shopStats(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: shop } = await supabase().from("shops").select("name").eq("id", shopId).single();
  const { count: totalOrders } = await supabase().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId);
  const { count: paidOrders } = await supabase().from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("payment_status", "paid");
  const { data: revenue } = await supabase().from("shop_orders").select("total_amount").eq("shop_id", shopId).eq("payment_status", "paid");
  const totalRevenue = revenue?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
  const { count: productCount } = await supabase().from("shop_products").select("id", { count: "exact", head: true }).eq("shop_id", shopId);

  const prodIds = (await supabase().from("shop_products").select("id").eq("shop_id", shopId)).data?.map((p: any) => p.id) || [];
  let invCount = 0;
  if (prodIds.length) {
    const { count } = await supabase().from("shop_inventory").select("id", { count: "exact", head: true }).eq("status", "available").in("product_id", prodIds);
    invCount = count || 0;
  }

  const text =
    `📊 <b>Статистика: ${esc(shop?.name || "")}</b>\n\n` +
    `🛍 Всего заказов: ${totalOrders || 0}\n` +
    `✅ Оплаченных: ${paidOrders || 0}\n` +
    `💰 Выручка: <b>$${totalRevenue.toFixed(2)}</b>\n\n` +
    `📦 Товаров: ${productCount || 0}\n` +
    `🗃 На складе: ${invCount} единиц`;

  return tg.edit(chatId, msgId, text, ikb([[btn("◀️ Админ-панель", `s:home:${shopId}`)]]));
}

// ═══════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════
async function showProducts(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page = 0) {
  const { data: products } = await supabase().from("shop_products").select("*").eq("shop_id", shopId).order("sort_order").order("created_at");
  if (!products?.length) {
    return tg.edit(chatId, msgId, "📦 <b>Товары</b>\n\nТоваров пока нет.", ikb([
      [btn("➕ Добавить товар", `s:addprod:${shopId}`)],
      [btn("◀️ Админ-панель", `s:home:${shopId}`)],
    ]));
  }

  const perPage = 8;
  const totalP = Math.ceil(products.length / perPage);
  const p = Math.min(Math.max(0, page), totalP - 1);
  const slice = products.slice(p * perPage, (p + 1) * perPage);

  let text = `📦 <b>Товары</b> (${products.length})\n\n`;
  slice.forEach((pr, i) => {
    const stock = pr.stock || 0;
    const dot = pr.is_active ? "🟢" : "🔴";
    text += `${dot} <b>${esc(pr.name)}</b> — $${Number(pr.price).toFixed(2)} (${stock} шт)\n`;
  });

  const rows: Btn[][] = slice.map(pr => [btn(`${pr.is_active ? "🟢" : "🔴"} ${pr.name}`, `s:prod:${shopId}:${pr.id}`)]);

  if (totalP > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `s:products:${shopId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalP}`, "s:noop"));
    if (p < totalP - 1) nav.push(btn("▶️", `s:products:${shopId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("➕ Добавить товар", `s:addprod:${shopId}`)]);
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function showProduct(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, productId: string) {
  const { data: pr } = await supabase().from("shop_products").select("*").eq("id", productId).single();
  if (!pr) return tg.edit(chatId, msgId, "❌ Товар не найден", ikb([[btn("◀️ Товары", `s:products:${shopId}:0`)]]));

  const { count: invCount } = await supabase().from("shop_inventory").select("id", { count: "exact", head: true }).eq("product_id", productId).eq("status", "available");

  const text =
    `📦 <b>${esc(pr.name)}</b>\n\n` +
    `💰 Цена: <b>$${Number(pr.price).toFixed(2)}</b>${pr.old_price ? ` <s>$${Number(pr.old_price).toFixed(2)}</s>` : ""}\n` +
    `📝 Описание: ${pr.description ? esc(pr.description.slice(0, 100)) : "—"}\n` +
    `📌 Подзаголовок: ${pr.subtitle || "—"}\n` +
    `📊 Статус: ${pr.is_active ? "🟢 Активен" : "🔴 Скрыт"}\n` +
    `📦 Stock (витрина): ${pr.stock}\n` +
    `🗃 Инвентарь: ${invCount || 0} единиц\n` +
    `🔧 Тип: ${pr.type}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Название", `s:editprod:${shopId}:${productId}:name`), btn("💰 Цена", `s:editprod:${shopId}:${productId}:price`)],
    [btn("📝 Описание", `s:editprod:${shopId}:${productId}:desc`), btn("📌 Подзаголовок", `s:editprod:${shopId}:${productId}:subtitle`)],
    [btn("🏷 Старая цена", `s:editprod:${shopId}:${productId}:old_price`)],
    [btn("📦 Загрузить инвентарь", `s:loadinv:${shopId}:${productId}`)],
    [btn(pr.is_active ? "🔴 Скрыть" : "🟢 Показать", `s:toggleprod:${shopId}:${productId}`)],
    [btn("🗑 Удалить товар", `s:delprod:${shopId}:${productId}`)],
    [btn("◀️ Товары", `s:products:${shopId}:0`)],
  ]));
}

// ═══════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════
async function showCategories(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: cats } = await supabase().from("shop_categories").select("*").eq("shop_id", shopId).order("sort_order");

  if (!cats?.length) {
    return tg.edit(chatId, msgId, "📂 <b>Категории</b>\n\nКатегорий пока нет.", ikb([
      [btn("➕ Добавить категорию", `s:addcat:${shopId}`)],
      [btn("◀️ Админ-панель", `s:home:${shopId}`)],
    ]));
  }

  let text = `📂 <b>Категории</b> (${cats.length})\n\n`;
  const rows: Btn[][] = cats.map(c => {
    text += `${c.icon} ${esc(c.name)} ${c.is_active ? "🟢" : "🔴"}\n`;
    return [btn(`${c.icon} ${c.name}`, `s:cat:${shopId}:${c.id}`)];
  });
  rows.push([btn("➕ Добавить категорию", `s:addcat:${shopId}`)]);
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function showCategory(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, catId: string) {
  const { data: cat } = await supabase().from("shop_categories").select("*").eq("id", catId).single();
  if (!cat) return;

  const text =
    `📂 <b>${cat.icon} ${esc(cat.name)}</b>\n\n` +
    `Статус: ${cat.is_active ? "🟢 Активна" : "🔴 Скрыта"}\n` +
    `Порядок: ${cat.sort_order}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Название", `s:editcat:${shopId}:${catId}:name`), btn("🎨 Иконка", `s:editcat:${shopId}:${catId}:icon`)],
    [btn(cat.is_active ? "🔴 Скрыть" : "🟢 Показать", `s:togglecat:${shopId}:${catId}`)],
    [btn("🗑 Удалить", `s:delcat:${shopId}:${catId}`)],
    [btn("◀️ Категории", `s:cats:${shopId}:0`)],
  ]));
}

// ═══════════════════════════════════════════════
// REVIEWS MODERATION
// ═══════════════════════════════════════════════
async function showReviews(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page = 0) {
  const { data: reviews } = await supabase().from("shop_reviews").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });

  if (!reviews?.length) {
    return tg.edit(chatId, msgId, "⭐ <b>Отзывы</b>\n\nОтзывов пока нет.", ikb([[btn("◀️ Админ-панель", `s:home:${shopId}`)]]));
  }

  const pending = reviews.filter(r => r.moderation_status === "pending");
  const approved = reviews.filter(r => r.moderation_status === "approved");

  let text = `⭐ <b>Отзывы</b>\n\n`;
  text += `📋 Всего: ${reviews.length}\n`;
  text += `⏳ На модерации: ${pending.length}\n`;
  text += `✅ Одобренных: ${approved.length}\n\n`;

  if (pending.length > 0) {
    text += `<b>Ожидают модерации:</b>\n`;
    pending.slice(0, 5).forEach(r => {
      text += `\n⭐${r.rating} от <b>${esc(r.author)}</b>: ${r.text ? esc(r.text.slice(0, 60)) : "—"}`;
    });
  }

  const rows: Btn[][] = [];
  pending.slice(0, 5).forEach(r => {
    rows.push([
      btn(`✅ ${r.author}`, `s:approvereview:${shopId}:${r.id}`),
      btn(`❌ ${r.author}`, `s:rejectreview:${shopId}:${r.id}`),
    ]);
  });
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════
async function showInventory(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const { data: products } = await supabase().from("shop_products").select("id, name, stock").eq("shop_id", shopId).order("name");
  if (!products?.length) {
    return tg.edit(chatId, msgId, "🗃 <b>Инвентарь</b>\n\nСначала добавьте товары.", ikb([
      [btn("📦 Товары", `s:products:${shopId}:0`)],
      [btn("◀️ Админ-панель", `s:home:${shopId}`)],
    ]));
  }

  let text = "🗃 <b>Инвентарь</b>\n\nВыберите товар для загрузки инвентаря:\n\n";
  const rows: Btn[][] = [];
  for (const pr of products) {
    const { count } = await supabase().from("shop_inventory").select("id", { count: "exact", head: true }).eq("product_id", pr.id).eq("status", "available");
    text += `📦 <b>${esc(pr.name)}</b> — ${count || 0} шт\n`;
    rows.push([btn(`📦 ${pr.name} (${count || 0})`, `s:loadinv:${shopId}:${pr.id}`)]);
  }

  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);
  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// PROMOCODES
// ═══════════════════════════════════════════════
async function showPromos(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  // For now, promo codes are global (promocodes table). Show info.
  const text =
    `🏷 <b>Промокоды</b>\n\n` +
    `Промокоды управляются через таблицу промокодов платформы.\n\n` +
    `Скоро: отдельные промокоды для каждого магазина.`;

  return tg.edit(chatId, msgId, text, ikb([[btn("◀️ Админ-панель", `s:home:${shopId}`)]]));
}

// ═══════════════════════════════════════════════
// BROADCAST
// ═══════════════════════════════════════════════
async function showBroadcast(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
  const text =
    `📢 <b>Рассылка</b>\n\n` +
    `Отправьте сообщение всем покупателям вашего магазина.\n\n` +
    `Поддерживается HTML-разметка.\n` +
    `Перед отправкой будет предпросмотр.`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn("✏️ Написать рассылку", `s:writebcast:${shopId}`)],
    [btn("◀️ Админ-панель", `s:home:${shopId}`)],
  ]));
}

// ═══════════════════════════════════════════════
// TEXT FSM HANDLER
// ═══════════════════════════════════════════════
async function handleText(tg: ReturnType<typeof TG>, chatId: number, text: string, shopId: string) {
  const session = await getSession(chatId, shopId);
  if (!session) return false;

  const state = session.state;
  const sData = { ...(session.data || {}) } as Record<string, unknown>;
  const val = text.trim();

  // ─── Edit shop field ──────────────────────
  if (state === "s_edit_field") {
    const field = sData.field as string;
    const fieldMap: Record<string, string> = {
      name: "name", color: "color", welcome: "welcome_message",
      support: "support_link", hero_title: "hero_title", hero_desc: "hero_description",
    };
    const dbField = fieldMap[field];
    if (!dbField) { await clearSession(chatId); return true; }

    if (field === "color" && !/^#?[0-9A-Fa-f]{6}$/.test(val)) {
      await tg.send(chatId, "❌ Введи HEX цвет, например: #FF5500");
      return true;
    }

    const updateVal = field === "color" ? (val.startsWith("#") ? val : `#${val}`) : val;
    await supabase().from("shops").update({ [dbField]: updateVal, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId);
    const resp = await tg.send(chatId, "✅ Обновлено!");
    const mid = resp?.result?.message_id;
    if (mid) await shopSettings(tg, chatId, mid, shopId);
    return true;
  }

  // ─── Set CryptoBot token ──────────────────
  if (state === "s_set_cryptobot") {
    if (val.length < 10) { await tg.send(chatId, "❌ Неверный формат:"); return true; }
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encKey) { await tg.send(chatId, "❌ Ошибка конфигурации."); return true; }
    const { data: enc } = await supabase().rpc("encrypt_token", { p_token: val, p_key: encKey });
    await supabase().from("shops").update({ cryptobot_token_encrypted: enc, updated_at: new Date().toISOString() }).eq("id", shopId);
    await clearSession(chatId);
    await tg.send(chatId, "✅ CryptoBot-токен сохранён!", ikb([[btn("◀️ Настройки", `s:settings:${shopId}`)]]));
    return true;
  }

  // ─── Add product step 1: name ─────────────
  if (state === "s_addprod_name") {
    if (val.length < 2 || val.length > 100) { await tg.send(chatId, "❌ Название: от 2 до 100 символов:"); return true; }
    sData.prod_name = val;
    await setSession(chatId, "s_addprod_price", shopId, sData);
    await tg.send(chatId, "💰 Введи цену в USD (например: 5.99):");
    return true;
  }
  if (state === "s_addprod_price") {
    const price = Number(val);
    if (!price || price <= 0 || price > 100000) { await tg.send(chatId, "❌ Цена: от 0.01 до 100000:"); return true; }
    sData.prod_price = price;
    await setSession(chatId, "s_addprod_desc", shopId, sData);
    await tg.send(chatId, "📝 Введи описание товара (или отправь <code>-</code> чтобы пропустить):", { inline_keyboard: [] });
    return true;
  }
  if (state === "s_addprod_desc") {
    const desc = val === "-" ? "" : val;
    // Create the product
    const { data: newProd, error } = await supabase().from("shop_products").insert({
      shop_id: shopId,
      name: sData.prod_name as string,
      price: sData.prod_price as number,
      description: desc,
      is_active: true,
    }).select("id, name").single();

    await clearSession(chatId);

    if (error || !newProd) {
      await tg.send(chatId, `❌ Ошибка: ${error?.message || "unknown"}`, ikb([[btn("◀️ Товары", `s:products:${shopId}:0`)]]));
      return true;
    }

    await tg.send(chatId,
      `✅ Товар <b>${esc(newProd.name)}</b> создан!\n\n💡 Теперь загрузите инвентарь для этого товара.`,
      ikb([
        [btn("📦 Загрузить инвентарь", `s:loadinv:${shopId}:${newProd.id}`)],
        [btn("◀️ Товары", `s:products:${shopId}:0`)],
      ]),
    );
    return true;
  }

  // ─── Edit product field ───────────────────
  if (state === "s_editprod_field") {
    const productId = sData.product_id as string;
    const field = sData.field as string;
    const fieldMap: Record<string, string> = {
      name: "name", price: "price", desc: "description",
      subtitle: "subtitle", old_price: "old_price",
    };
    const dbField = fieldMap[field];
    if (!dbField) { await clearSession(chatId); return true; }

    let updateVal: unknown = val;
    if (field === "price" || field === "old_price") {
      const num = Number(val);
      if (isNaN(num) || num < 0) { await tg.send(chatId, "❌ Введи число:"); return true; }
      updateVal = num;
    }

    await supabase().from("shop_products").update({ [dbField]: updateVal, updated_at: new Date().toISOString() }).eq("id", productId);
    await clearSession(chatId);
    const resp = await tg.send(chatId, "✅ Обновлено!");
    const mid = resp?.result?.message_id;
    if (mid) await showProduct(tg, chatId, mid, shopId, productId);
    return true;
  }

  // ─── Load inventory ───────────────────────
  if (state === "s_loadinv") {
    const productId = sData.product_id as string;
    const lines = val.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { await tg.send(chatId, "❌ Отправь хотя бы одну строку:"); return true; }

    const items = lines.map(content => ({
      product_id: productId,
      content,
      status: "available",
    }));

    const { error } = await supabase().from("shop_inventory").insert(items);
    if (error) {
      await tg.send(chatId, `❌ Ошибка: ${error.message}`);
      return true;
    }

    // Update stock count
    const { count } = await supabase().from("shop_inventory").select("id", { count: "exact", head: true }).eq("product_id", productId).eq("status", "available");
    await supabase().from("shop_products").update({ stock: count || 0, updated_at: new Date().toISOString() }).eq("id", productId);

    await clearSession(chatId);
    await tg.send(chatId,
      `✅ Загружено <b>${lines.length}</b> единиц!\n📦 Всего на складе: ${count || 0}`,
      ikb([
        [btn("📦 Ещё загрузить", `s:loadinv:${shopId}:${productId}`)],
        [btn("◀️ Товар", `s:prod:${shopId}:${productId}`)],
      ]),
    );
    return true;
  }

  // ─── Add category ─────────────────────────
  if (state === "s_addcat_name") {
    if (val.length < 1 || val.length > 50) { await tg.send(chatId, "❌ От 1 до 50 символов:"); return true; }
    sData.cat_name = val;
    await setSession(chatId, "s_addcat_icon", shopId, sData);
    await tg.send(chatId, "🎨 Отправь иконку (эмодзи) для категории (например: ⚡, 🎮, 💻):");
    return true;
  }
  if (state === "s_addcat_icon") {
    const icon = val.slice(0, 4) || "⚡";
    const { error } = await supabase().from("shop_categories").insert({
      shop_id: shopId,
      name: sData.cat_name as string,
      icon,
    });
    await clearSession(chatId);
    if (error) {
      await tg.send(chatId, `❌ Ошибка: ${error.message}`, ikb([[btn("◀️ Категории", `s:cats:${shopId}:0`)]]));
    } else {
      await tg.send(chatId, `✅ Категория <b>${icon} ${esc(sData.cat_name as string)}</b> создана!`, ikb([[btn("◀️ Категории", `s:cats:${shopId}:0`)]]));
    }
    return true;
  }

  // ─── Edit category field ──────────────────
  if (state === "s_editcat_field") {
    const catId = sData.cat_id as string;
    const field = sData.field as string;
    const dbField = field === "name" ? "name" : "icon";
    const updateVal = field === "icon" ? val.slice(0, 4) : val;
    await supabase().from("shop_categories").update({ [dbField]: updateVal }).eq("id", catId);
    await clearSession(chatId);
    const resp = await tg.send(chatId, "✅ Обновлено!");
    const mid = resp?.result?.message_id;
    if (mid) await showCategory(tg, chatId, mid, shopId, catId);
    return true;
  }

  // ─── Broadcast message ────────────────────
  if (state === "s_bcast_text") {
    sData.bcast_text = val;
    await setSession(chatId, "s_bcast_confirm", shopId, sData);
    await tg.send(chatId, `📢 <b>Предпросмотр рассылки:</b>\n\n${val}\n\n⚠️ Подтвердите отправку:`, ikb([
      [btn("✅ Отправить", `s:confirmbcast:${shopId}`)],
      [btn("✏️ Изменить", `s:writebcast:${shopId}`)],
      [btn("❌ Отмена", `s:home:${shopId}`)],
    ]));
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════════
async function handleCallback(tg: ReturnType<typeof TG>, chatId: number, msgId: number, data: string, cbId: string, shopId: string) {
  await tg.answer(cbId);
  const parts = data.split(":");
  const cmd = parts[1];

  if (cmd === "noop") return;

  if (cmd === "home") return adminHome(tg, chatId, shopId, msgId);
  if (cmd === "settings") return shopSettings(tg, chatId, msgId, parts[2]);
  if (cmd === "stats") return shopStats(tg, chatId, msgId, parts[2]);
  if (cmd === "products") return showProducts(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
  if (cmd === "prod") return showProduct(tg, chatId, msgId, parts[2], parts[3]);
  if (cmd === "cats") return showCategories(tg, chatId, msgId, parts[2]);
  if (cmd === "cat") return showCategory(tg, chatId, msgId, parts[2], parts[3]);
  if (cmd === "reviews") return showReviews(tg, chatId, msgId, parts[2]);
  if (cmd === "inv") return showInventory(tg, chatId, msgId, parts[2]);
  if (cmd === "promos") return showPromos(tg, chatId, msgId, parts[2]);
  if (cmd === "broadcast") return showBroadcast(tg, chatId, msgId, parts[2]);

  // ─── Edit shop field ──────────────────────
  if (cmd === "edit") {
    const sid = parts[2];
    const field = parts[3];
    const labels: Record<string, string> = {
      name: "📛 название магазина", color: "🎨 HEX цвет (например #FF5500)",
      hero_title: "📌 заголовок витрины", hero_desc: "📝 описание витрины",
      welcome: "👋 приветственное сообщение", support: "🔗 ссылку на поддержку",
    };
    await setSession(chatId, "s_edit_field", sid, { field });
    return tg.edit(chatId, msgId, `✏️ Введи новое ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `s:settings:${sid}`)]]));
  }

  // ─── Set CryptoBot ────────────────────────
  if (cmd === "setcb") {
    const sid = parts[2];
    await setSession(chatId, "s_set_cryptobot", sid, {});
    return tg.edit(chatId, msgId,
      "💰 <b>Подключение CryptoBot</b>\n\nОтправь API-токен от @CryptoBot:\n\n⚠️ Токен будет зашифрован.",
      ikb([[btn("❌ Отмена", `s:settings:${sid}`)]]),
    );
  }

  // ─── Add product ──────────────────────────
  if (cmd === "addprod") {
    const sid = parts[2];
    await setSession(chatId, "s_addprod_name", sid, {});
    return tg.edit(chatId, msgId, "📦 <b>Новый товар</b>\n\nВведи название товара:", ikb([[btn("❌ Отмена", `s:products:${sid}:0`)]]));
  }

  // ─── Edit product field ───────────────────
  if (cmd === "editprod") {
    const sid = parts[2];
    const productId = parts[3];
    const field = parts[4];
    const labels: Record<string, string> = {
      name: "название", price: "цену (число)", desc: "описание",
      subtitle: "подзаголовок", old_price: "старую цену (число или 0)",
    };
    await setSession(chatId, "s_editprod_field", sid, { product_id: productId, field });
    return tg.edit(chatId, msgId, `✏️ Введи новое ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `s:prod:${sid}:${productId}`)]]));
  }

  // ─── Toggle product ───────────────────────
  if (cmd === "toggleprod") {
    const sid = parts[2];
    const productId = parts[3];
    const { data: pr } = await supabase().from("shop_products").select("is_active").eq("id", productId).single();
    if (pr) {
      await supabase().from("shop_products").update({ is_active: !pr.is_active, updated_at: new Date().toISOString() }).eq("id", productId);
    }
    return showProduct(tg, chatId, msgId, sid, productId);
  }

  // ─── Delete product ───────────────────────
  if (cmd === "delprod") {
    const sid = parts[2];
    const productId = parts[3];
    return tg.edit(chatId, msgId, "🗑 Удалить этот товар и весь его инвентарь?\n\n⚠️ Это действие необратимо.", ikb([
      [btn("🗑 Да, удалить", `s:confirmdelprod:${sid}:${productId}`), btn("❌ Нет", `s:prod:${sid}:${productId}`)],
    ]));
  }
  if (cmd === "confirmdelprod") {
    const sid = parts[2];
    const productId = parts[3];
    await supabase().from("shop_inventory").delete().eq("product_id", productId);
    await supabase().from("shop_products").delete().eq("id", productId);
    await tg.edit(chatId, msgId, "✅ Товар удалён.", ikb([[btn("◀️ Товары", `s:products:${sid}:0`)]]));
    return;
  }

  // ─── Load inventory ───────────────────────
  if (cmd === "loadinv") {
    const sid = parts[2];
    const productId = parts[3];
    const { data: pr } = await supabase().from("shop_products").select("name").eq("id", productId).single();
    await setSession(chatId, "s_loadinv", sid, { product_id: productId });
    return tg.edit(chatId, msgId,
      `📦 <b>Загрузка инвентаря: ${esc(pr?.name || "")}</b>\n\n` +
      `Отправьте данные — каждая строка = 1 единица товара.\n\n` +
      `Примеры:\n<code>login:password</code>\n<code>XXXX-XXXX-XXXX-XXXX</code>\n<code>https://drive.google.com/file/...</code>\n\n` +
      `💡 Для объёмных файлов используйте ссылки на облачные хранилища.`,
      ikb([[btn("❌ Отмена", `s:prod:${sid}:${productId}`)]]),
    );
  }

  // ─── Add category ─────────────────────────
  if (cmd === "addcat") {
    const sid = parts[2];
    await setSession(chatId, "s_addcat_name", sid, {});
    return tg.edit(chatId, msgId, "📂 <b>Новая категория</b>\n\nВведи название категории:", ikb([[btn("❌ Отмена", `s:cats:${sid}:0`)]]));
  }

  // ─── Edit category field ──────────────────
  if (cmd === "editcat") {
    const sid = parts[2];
    const catId = parts[3];
    const field = parts[4];
    const labels: Record<string, string> = { name: "название", icon: "иконку (эмодзи)" };
    await setSession(chatId, "s_editcat_field", sid, { cat_id: catId, field });
    return tg.edit(chatId, msgId, `✏️ Введи ${labels[field] || field}:`, ikb([[btn("❌ Отмена", `s:cat:${sid}:${catId}`)]]));
  }

  // ─── Toggle category ──────────────────────
  if (cmd === "togglecat") {
    const sid = parts[2];
    const catId = parts[3];
    const { data: cat } = await supabase().from("shop_categories").select("is_active").eq("id", catId).single();
    if (cat) {
      await supabase().from("shop_categories").update({ is_active: !cat.is_active }).eq("id", catId);
    }
    return showCategory(tg, chatId, msgId, sid, catId);
  }

  // ─── Delete category ──────────────────────
  if (cmd === "delcat") {
    const sid = parts[2];
    const catId = parts[3];
    await supabase().from("shop_categories").delete().eq("id", catId);
    return tg.edit(chatId, msgId, "✅ Категория удалена.", ikb([[btn("◀️ Категории", `s:cats:${sid}:0`)]]));
  }

  // ─── Approve/reject review ────────────────
  if (cmd === "approvereview") {
    const sid = parts[2];
    const reviewId = parts[3];
    await supabase().from("shop_reviews").update({ moderation_status: "approved", verified: true }).eq("id", reviewId);
    return showReviews(tg, chatId, msgId, sid);
  }
  if (cmd === "rejectreview") {
    const sid = parts[2];
    const reviewId = parts[3];
    await supabase().from("shop_reviews").update({ moderation_status: "rejected" }).eq("id", reviewId);
    return showReviews(tg, chatId, msgId, sid);
  }

  // ─── Broadcast ────────────────────────────
  if (cmd === "writebcast") {
    const sid = parts[2];
    await setSession(chatId, "s_bcast_text", sid, {});
    return tg.edit(chatId, msgId, "✏️ Введи текст рассылки (поддерживается HTML):", ikb([[btn("❌ Отмена", `s:home:${sid}`)]]));
  }
  if (cmd === "confirmbcast") {
    const sid = parts[2];
    const session = await getSession(chatId, sid);
    if (!session) return;
    const bcastText = session.data?.bcast_text as string;
    if (!bcastText) return;

    // Get unique buyer telegram_ids
    const { data: orders } = await supabase().from("shop_orders").select("buyer_telegram_id").eq("shop_id", sid);
    const uniqueIds = [...new Set(orders?.map((o: any) => o.buyer_telegram_id) || [])];

    await clearSession(chatId);

    if (!uniqueIds.length) {
      return tg.edit(chatId, msgId, "❌ Нет покупателей для рассылки.", ikb([[btn("◀️ Админ-панель", `s:home:${sid}`)]]));
    }

    let sent = 0;
    let failed = 0;
    for (const tgId of uniqueIds) {
      try {
        await tg.send(tgId as number, bcastText);
        sent++;
      } catch {
        failed++;
      }
    }

    return tg.edit(chatId, msgId,
      `📢 <b>Рассылка завершена!</b>\n\n✅ Отправлено: ${sent}\n❌ Ошибок: ${failed}`,
      ikb([[btn("◀️ Админ-панель", `s:home:${sid}`)]]),
    );
  }
}

// ═══════════════════════════════════════════════
// MAIN SERVE
// ═══════════════════════════════════════════════
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
    const { data: shop } = await supabase().from("shops").select("id, name, slug, bot_token_encrypted, welcome_message, support_link, status, owner_id").eq("id", shopId).single();
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

    const { data: botToken } = await supabase().rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: encKey });
    if (!botToken) {
      console.error("seller-bot-webhook: failed to decrypt bot token");
      return new Response("ok");
    }

    const tg = TG(botToken);
    const body = await req.json();
    const msg = body.message;
    const cb = body.callback_query;

    // ─── Callback query (admin) ─────────────
    if (cb) {
      const chatId = cb.message?.chat?.id || cb.from?.id;
      const msgId = cb.message?.message_id;
      const data = cb.data;
      if (chatId && msgId && data && data.startsWith("s:")) {
        // Verify ownership
        const isOwner = await isShopOwner(shopId, chatId);
        if (!isOwner) {
          await tg.answer(cb.id, "⛔ Нет доступа");
          return new Response("ok");
        }
        await handleCallback(tg, chatId, msgId, data, cb.id, shopId);
      }
      return new Response("ok");
    }

    if (!msg) return new Response("ok");

    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const firstName = msg.from?.first_name || "друг";

    // ─── /admin command ─────────────────────
    if (text === "/admin") {
      const isOwner = await isShopOwner(shopId, chatId);
      if (!isOwner) {
        await tg.send(chatId, "⛔ У вас нет доступа к админ-панели этого магазина.");
        return new Response("ok");
      }
      await clearSession(chatId);
      await adminHome(tg, chatId, shopId);
      return new Response("ok");
    }

    // ─── FSM text handler (admin) ───────────
    const isOwner = await isShopOwner(shopId, chatId);
    if (isOwner) {
      const handled = await handleText(tg, chatId, text, shopId);
      if (handled) return new Response("ok");
    }

    // ─── /start command ─────────────────────
    if (text === "/start" || text.startsWith("/start ")) {
      const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
      const welcomeText = shop.welcome_message || `Добро пожаловать в ${shop.name}!`;

      const greeting =
        `👋 Привет, <b>${esc(firstName)}</b>!\n\n` +
        `${esc(welcomeText)}\n\n` +
        `🛍 Откройте витрину чтобы посмотреть товары:`;

      const supportUrl = shop.support_link
        ? (shop.support_link.startsWith("http") ? shop.support_link : `https://${shop.support_link}`)
        : null;

      const kb: Record<string, unknown> = {
        inline_keyboard: [
          [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
          ...(supportUrl ? [[{ text: "🆘 Поддержка", url: supportUrl }]] : []),
        ],
      };

      await tg.send(chatId, greeting, kb);
      return new Response("ok");
    }

    // ─── /help ──────────────────────────────
    if (text === "/help") {
      const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
      const helpText =
        `ℹ️ <b>${esc(shop.name)}</b>\n\n` +
        `Это бот магазина ${esc(shop.name)}.\n` +
        `Нажмите кнопку ниже чтобы открыть витрину.`;

      const supportUrl = shop.support_link
        ? (shop.support_link.startsWith("http") ? shop.support_link : `https://${shop.support_link}`)
        : null;

      await tg.send(chatId, helpText, {
        inline_keyboard: [
          [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
          ...(supportUrl ? [[{ text: "🆘 Поддержка", url: supportUrl }]] : []),
        ],
      });
      return new Response("ok");
    }

    // ─── Default ────────────────────────────
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
