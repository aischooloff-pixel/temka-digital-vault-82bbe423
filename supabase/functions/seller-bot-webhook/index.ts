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
      call("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }).then(r => {
        if (!r.ok) console.error("editMessageText failed:", JSON.stringify(r));
        return r;
      }),
    answer: (cbId: string, text?: string) =>
      call("answerCallbackQuery", { callback_query_id: cbId, ...(text ? { text, show_alert: true } : {}) }),
    deleteMessage: (chatId: number, msgId: number) =>
      call("deleteMessage", { chat_id: chatId, message_id: msgId }).catch(() => {}),
  };
};

type Btn = { text: string; callback_data?: string; url?: string; web_app?: { url: string } };
const btn = (t: string, cb: string): Btn => ({ text: t, callback_data: cb });
const ikb = (rows: Btn[][]) => ({ inline_keyboard: rows });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const WEBAPP_DOMAIN = Deno.env.get("WEBAPP_URL") || "https://temka-digital-vault.lovable.app";

// ─── Admin log helper ──────────────────────
async function logAction(shopId: string, adminTgId: number, action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) {
  await supabase().from("shop_admin_logs").insert({
    shop_id: shopId,
    admin_telegram_id: adminTgId,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    details: details || {},
  });
}

// ─── Session FSM ───────────────────────────
async function getSession(tgId: number, shopId: string) {
  const { data } = await supabase().from("platform_sessions").select("*").eq("telegram_id", tgId).maybeSingle();
  if (!data) return null;
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

  const text =
    `🔧 <b>Админ-панель: ${esc(shop.name)}</b>\n\n` +
    `📊 Статус: ${shop.status === "active" ? "активен 🟢" : "остановлен 🔴"}\n` +
    `📦 Товаров: ${productCount || 0}\n` +
    `📂 Категорий: ${categoryCount || 0}\n` +
    `🛍 Заказов: ${orderCount || 0}\n\nВыберите раздел:`;

  const kb = ikb([
    [btn("📦 Товары", `s:products:${shopId}:0`), btn("📂 Категории", `s:cats:${shopId}:0`)],
    [btn("🛍 Заказы", `s:orders:${shopId}:0`), btn("👥 Пользователи", `s:users:${shopId}:0`)],
    [btn("📊 Статистика", `s:stats:${shopId}`), btn("🏷 Промокоды", `s:promos:${shopId}:0`)],
    [btn("🗃 Склад", `s:inv:${shopId}:0`), btn("📋 Логи", `s:logs:${shopId}:0`)],
    [btn("⚙️ Настройки", `s:settings:${shopId}`), btn("📢 Рассылка", `s:broadcast:${shopId}`)],
    [btn("⭐ Отзывы", `s:reviews:${shopId}:0`)],
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

  // Unique buyers
  const { data: buyerData } = await supabase().from("shop_orders").select("buyer_telegram_id").eq("shop_id", shopId);
  const uniqueBuyers = new Set(buyerData?.map((o: any) => o.buyer_telegram_id) || []).size;

  const text =
    `📊 <b>Статистика: ${esc(shop?.name || "")}</b>\n\n` +
    `🛍 Всего заказов: ${totalOrders || 0}\n` +
    `✅ Оплаченных: ${paidOrders || 0}\n` +
    `💰 Выручка: <b>$${totalRevenue.toFixed(2)}</b>\n` +
    `👥 Покупателей: ${uniqueBuyers}\n\n` +
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
  slice.forEach(pr => {
    const dot = pr.is_active ? "🟢" : "🔴";
    text += `${dot} <b>${esc(pr.name)}</b> — $${Number(pr.price).toFixed(2)} (${pr.stock} шт)\n`;
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
    `📦 Stock: ${pr.stock}\n` +
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
// ORDERS
// ═══════════════════════════════════════════════
async function showOrders(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page = 0) {
  const { data: orders } = await supabase()
    .from("shop_orders")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (!orders?.length) {
    return tg.edit(chatId, msgId, "🛍 <b>Заказы</b>\n\nЗаказов пока нет.", ikb([[btn("◀️ Админ-панель", `s:home:${shopId}`)]]));
  }

  const perPage = 8;
  const totalP = Math.ceil(orders.length / perPage);
  const p = Math.min(Math.max(0, page), totalP - 1);
  const slice = orders.slice(p * perPage, (p + 1) * perPage);

  const statusEmoji: Record<string, string> = {
    paid: "✅", delivered: "📬", completed: "✅", pending: "⏳", awaiting_payment: "⏳",
    processing: "🔄", cancelled: "❌", error: "⚠️",
  };

  let text = `🛍 <b>Заказы</b> (${orders.length})\n\n`;
  slice.forEach(o => {
    const emoji = statusEmoji[o.payment_status] || statusEmoji[o.status] || "❓";
    const date = new Date(o.created_at).toLocaleDateString("ru-RU");
    text += `${emoji} <code>${o.order_number}</code> — $${Number(o.total_amount).toFixed(2)} (${date})\n`;
  });

  const rows: Btn[][] = slice.map(o => [btn(`${statusEmoji[o.payment_status] || "❓"} ${o.order_number}`, `s:order:${shopId}:${o.id}`)]);

  if (totalP > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `s:orders:${shopId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalP}`, "s:noop"));
    if (p < totalP - 1) nav.push(btn("▶️", `s:orders:${shopId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function showOrder(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, orderId: string) {
  const { data: order } = await supabase().from("shop_orders").select("*").eq("id", orderId).single();
  if (!order) return tg.edit(chatId, msgId, "❌ Заказ не найден", ikb([[btn("◀️ Заказы", `s:orders:${shopId}:0`)]]));

  const { data: items } = await supabase().from("shop_order_items").select("*").eq("order_id", orderId);

  const statusLabels: Record<string, string> = {
    paid: "✅ Оплачен", delivered: "📬 Доставлен", completed: "✅ Завершён",
    pending: "⏳ Ожидание", awaiting_payment: "⏳ Ожидает оплаты",
    processing: "🔄 Обработка", cancelled: "❌ Отменён", error: "⚠️ Ошибка",
  };

  let text =
    `🛍 <b>Заказ ${esc(order.order_number)}</b>\n\n` +
    `📅 Дата: ${new Date(order.created_at).toLocaleString("ru-RU")}\n` +
    `💰 Сумма: <b>$${Number(order.total_amount).toFixed(2)}</b>\n` +
    `💳 Оплата: ${statusLabels[order.payment_status] || order.payment_status}\n` +
    `📦 Статус: ${statusLabels[order.status] || order.status}\n` +
    `👤 Покупатель: <code>${order.buyer_telegram_id}</code>\n`;

  if (Number(order.balance_used) > 0) {
    text += `💎 Баланс использован: $${Number(order.balance_used).toFixed(2)}\n`;
  }

  if (items?.length) {
    text += `\n<b>Товары:</b>\n`;
    items.forEach((it: any) => {
      text += `  • ${esc(it.product_name)} ×${it.quantity} — $${Number(it.product_price * it.quantity).toFixed(2)}\n`;
    });
  }

  const rows: Btn[][] = [];
  // Allow marking as delivered/completed if paid
  if (order.payment_status === "paid" && order.status !== "delivered" && order.status !== "completed") {
    rows.push([btn("📬 Отметить доставлен", `s:orderstatus:${shopId}:${orderId}:delivered`)]);
  }
  if (order.status === "delivered") {
    rows.push([btn("✅ Завершить", `s:orderstatus:${shopId}:${orderId}:completed`)]);
  }
  rows.push([btn("◀️ Заказы", `s:orders:${shopId}:0`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// USERS / BUYERS
// ═══════════════════════════════════════════════
async function showUsers(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page = 0) {
  // Get unique buyers with order stats
  const { data: ordersRaw } = await supabase()
    .from("shop_orders")
    .select("buyer_telegram_id, total_amount, payment_status")
    .eq("shop_id", shopId);

  if (!ordersRaw?.length) {
    return tg.edit(chatId, msgId, "👥 <b>Пользователи</b>\n\nПокупателей пока нет.", ikb([[btn("◀️ Админ-панель", `s:home:${shopId}`)]]));
  }

  // Aggregate by buyer
  const buyerMap = new Map<number, { orders: number; paid: number; spent: number }>();
  ordersRaw.forEach((o: any) => {
    const id = o.buyer_telegram_id;
    const existing = buyerMap.get(id) || { orders: 0, paid: 0, spent: 0 };
    existing.orders++;
    if (o.payment_status === "paid") {
      existing.paid++;
      existing.spent += Number(o.total_amount);
    }
    buyerMap.set(id, existing);
  });

  const buyers = Array.from(buyerMap.entries())
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.spent - a.spent);

  const perPage = 8;
  const totalP = Math.ceil(buyers.length / perPage);
  const p = Math.min(Math.max(0, page), totalP - 1);
  const slice = buyers.slice(p * perPage, (p + 1) * perPage);

  // Fetch user profiles for these telegram IDs
  const tgIds = slice.map(b => b.id);
  const { data: profiles } = await supabase().from("user_profiles").select("telegram_id, first_name, username").in("telegram_id", tgIds);
  const profileMap = new Map((profiles || []).map((p: any) => [p.telegram_id, p]));

  let text = `👥 <b>Пользователи</b> (${buyers.length})\n\n`;
  slice.forEach(b => {
    const prof = profileMap.get(b.id);
    const name = prof ? (prof.username ? `@${prof.username}` : esc(prof.first_name)) : `ID:${b.id}`;
    text += `👤 ${name} — ${b.paid} заказ(ов), $${b.spent.toFixed(2)}\n`;
  });

  const rows: Btn[][] = slice.map(b => {
    const prof = profileMap.get(b.id);
    const label = prof ? (prof.username ? `@${prof.username}` : prof.first_name) : `${b.id}`;
    return [btn(`👤 ${label}`, `s:user:${shopId}:${b.id}`)];
  });

  if (totalP > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `s:users:${shopId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalP}`, "s:noop"));
    if (p < totalP - 1) nav.push(btn("▶️", `s:users:${shopId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function showUser(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, tgId: string) {
  const telegramId = Number(tgId);
  const { data: profile } = await supabase().from("user_profiles").select("*").eq("telegram_id", telegramId).maybeSingle();

  // Get orders for this buyer in this shop
  const { data: orders } = await supabase()
    .from("shop_orders")
    .select("*")
    .eq("shop_id", shopId)
    .eq("buyer_telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalOrders = orders?.length || 0;
  const paidOrders = orders?.filter((o: any) => o.payment_status === "paid") || [];
  const totalSpent = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

  const name = profile ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}` : `ID: ${telegramId}`;
  const username = profile?.username ? `@${profile.username}` : "—";

  let text =
    `👤 <b>${esc(name)}</b>\n\n` +
    `🆔 Telegram ID: <code>${telegramId}</code>\n` +
    `📛 Username: ${username}\n` +
    `💎 Premium: ${profile?.is_premium ? "✅" : "❌"}\n` +
    `🚫 Заблокирован: ${profile?.is_blocked ? "✅" : "❌"}\n` +
    `💰 Баланс: $${Number(profile?.balance || 0).toFixed(2)}\n\n` +
    `<b>В этом магазине:</b>\n` +
    `🛍 Заказов: ${totalOrders}\n` +
    `✅ Оплачено: ${paidOrders.length}\n` +
    `💵 Потрачено: $${totalSpent.toFixed(2)}`;

  if (orders?.length) {
    text += `\n\n<b>Последние заказы:</b>\n`;
    orders.slice(0, 5).forEach((o: any) => {
      const date = new Date(o.created_at).toLocaleDateString("ru-RU");
      text += `  ${o.payment_status === "paid" ? "✅" : "⏳"} ${o.order_number} — $${Number(o.total_amount).toFixed(2)} (${date})\n`;
    });
  }

  return tg.edit(chatId, msgId, text, ikb([
    [btn("◀️ Пользователи", `s:users:${shopId}:0`)],
  ]));
}

// ═══════════════════════════════════════════════
// PROMOCODES
// ═══════════════════════════════════════════════
async function showPromos(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page = 0) {
  const { data: promos } = await supabase()
    .from("shop_promocodes")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (!promos?.length) {
    return tg.edit(chatId, msgId, "🏷 <b>Промокоды</b>\n\nПромокодов пока нет.", ikb([
      [btn("➕ Создать промокод", `s:addpromo:${shopId}`)],
      [btn("◀️ Админ-панель", `s:home:${shopId}`)],
    ]));
  }

  const perPage = 8;
  const totalP = Math.ceil(promos.length / perPage);
  const p = Math.min(Math.max(0, page), totalP - 1);
  const slice = promos.slice(p * perPage, (p + 1) * perPage);

  let text = `🏷 <b>Промокоды</b> (${promos.length})\n\n`;
  slice.forEach((pr: any) => {
    const dot = pr.is_active ? "🟢" : "🔴";
    const discountStr = pr.discount_type === "percent" ? `${pr.discount_value}%` : `$${Number(pr.discount_value).toFixed(2)}`;
    text += `${dot} <code>${esc(pr.code)}</code> — ${discountStr} (исп: ${pr.used_count}${pr.max_uses ? `/${pr.max_uses}` : ""})\n`;
  });

  const rows: Btn[][] = slice.map((pr: any) => [btn(`${pr.is_active ? "🟢" : "🔴"} ${pr.code}`, `s:promo:${shopId}:${pr.id}`)]);

  if (totalP > 1) {
    const nav: Btn[] = [];
    if (p > 0) nav.push(btn("◀️", `s:promos:${shopId}:${p - 1}`));
    nav.push(btn(`${p + 1}/${totalP}`, "s:noop"));
    if (p < totalP - 1) nav.push(btn("▶️", `s:promos:${shopId}:${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("➕ Создать промокод", `s:addpromo:${shopId}`)]);
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

async function showPromo(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, promoId: string) {
  const { data: pr } = await supabase().from("shop_promocodes").select("*").eq("id", promoId).single();
  if (!pr) return tg.edit(chatId, msgId, "❌ Промокод не найден", ikb([[btn("◀️ Промокоды", `s:promos:${shopId}:0`)]]));

  const discountStr = pr.discount_type === "percent" ? `${pr.discount_value}%` : `$${Number(pr.discount_value).toFixed(2)}`;

  const text =
    `🏷 <b>Промокод: ${esc(pr.code)}</b>\n\n` +
    `💰 Скидка: <b>${discountStr}</b> (${pr.discount_type === "percent" ? "процент" : "фикс. сумма"})\n` +
    `📊 Статус: ${pr.is_active ? "🟢 Активен" : "🔴 Неактивен"}\n` +
    `🔢 Использований: ${pr.used_count}${pr.max_uses ? ` / ${pr.max_uses}` : " (безлимит)"}\n` +
    `👤 Макс на юзера: ${pr.max_uses_per_user || "безлимит"}\n` +
    `📅 Действует: ${pr.valid_from ? new Date(pr.valid_from).toLocaleDateString("ru-RU") : "—"} — ${pr.valid_until ? new Date(pr.valid_until).toLocaleDateString("ru-RU") : "∞"}`;

  return tg.edit(chatId, msgId, text, ikb([
    [btn(pr.is_active ? "🔴 Деактивировать" : "🟢 Активировать", `s:togglepromo:${shopId}:${promoId}`)],
    [btn("🗑 Удалить", `s:delpromo:${shopId}:${promoId}`)],
    [btn("◀️ Промокоды", `s:promos:${shopId}:0`)],
  ]));
}

// ═══════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════
async function showLogs(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string, page = 0) {
  const { data: logs, count: totalCount } = await supabase()
    .from("shop_admin_logs")
    .select("*", { count: "exact" })
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .range(page * 10, (page + 1) * 10 - 1);

  if (!logs?.length && page === 0) {
    return tg.edit(chatId, msgId, "📋 <b>Логи</b>\n\nДействий пока нет.", ikb([[btn("◀️ Админ-панель", `s:home:${shopId}`)]]));
  }

  const total = totalCount || 0;
  const totalP = Math.ceil(total / 10);

  let text = `📋 <b>Логи</b> (${total})\n\n`;
  (logs || []).forEach((l: any) => {
    const date = new Date(l.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    text += `${date} — ${esc(l.action)}`;
    if (l.entity_type) text += ` [${l.entity_type}]`;
    text += `\n`;
  });

  const rows: Btn[][] = [];
  if (totalP > 1) {
    const nav: Btn[] = [];
    if (page > 0) nav.push(btn("◀️", `s:logs:${shopId}:${page - 1}`));
    nav.push(btn(`${page + 1}/${totalP}`, "s:noop"));
    if (page < totalP - 1) nav.push(btn("▶️", `s:logs:${shopId}:${page + 1}`));
    rows.push(nav);
  }
  rows.push([btn("◀️ Админ-панель", `s:home:${shopId}`)]);

  return tg.edit(chatId, msgId, text, ikb(rows));
}

// ═══════════════════════════════════════════════
// REVIEWS MODERATION
// ═══════════════════════════════════════════════
async function showReviews(tg: ReturnType<typeof TG>, chatId: number, msgId: number, shopId: string) {
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
    return tg.edit(chatId, msgId, "🗃 <b>Склад</b>\n\nСначала добавьте товары.", ikb([
      [btn("📦 Товары", `s:products:${shopId}:0`)],
      [btn("◀️ Админ-панель", `s:home:${shopId}`)],
    ]));
  }

  let text = "🗃 <b>Склад</b>\n\nВыберите товар для загрузки инвентаря:\n\n";
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
    await logAction(shopId, chatId, `Изменено: ${field} → ${updateVal.slice(0, 50)}`, "shop", shopId);
    await clearSession(chatId);
    const resp = await tg.send(chatId, "✅ Обновлено!");
    const mid = resp?.result?.message_id;
    if (mid) await shopSettings(tg, chatId, mid, shopId);
    return true;
  }

  // ─── Set CryptoBot token ──────────────────
  if (state === "s_set_cryptobot") {
    if (val.length < 10) { await tg.send(chatId, "❌ Неверный формат."); return true; }
    const encKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encKey) { await tg.send(chatId, "❌ Ошибка конфигурации."); return true; }
    const { data: enc } = await supabase().rpc("encrypt_token", { p_token: val, p_key: encKey });
    await supabase().from("shops").update({ cryptobot_token_encrypted: enc, updated_at: new Date().toISOString() }).eq("id", shopId);
    await logAction(shopId, chatId, "CryptoBot токен обновлён", "shop", shopId);
    await clearSession(chatId);
    await tg.send(chatId, "✅ CryptoBot-токен сохранён!", ikb([[btn("◀️ Настройки", `s:settings:${shopId}`)]]));
    return true;
  }

  // ─── Add product step 1: name ─────────────
  if (state === "s_addprod_name") {
    if (val.length < 2 || val.length > 100) { await tg.send(chatId, "❌ Название: от 2 до 100 символов."); return true; }
    sData.prod_name = val;
    await setSession(chatId, "s_addprod_price", shopId, sData);
    await tg.send(chatId, "💰 Введи цену в USD (например: 5.99):");
    return true;
  }
  if (state === "s_addprod_price") {
    const price = Number(val);
    if (!price || price <= 0 || price > 100000) { await tg.send(chatId, "❌ Цена: от 0.01 до 100000."); return true; }
    sData.prod_price = price;
    await setSession(chatId, "s_addprod_desc", shopId, sData);
    await tg.send(chatId, "📝 Введи описание товара (или отправь <code>-</code> чтобы пропустить):");
    return true;
  }
  if (state === "s_addprod_desc") {
    const desc = val === "-" ? "" : val;
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

    await logAction(shopId, chatId, `Товар создан: ${newProd.name}`, "product", newProd.id);
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
      if (isNaN(num) || num < 0) { await tg.send(chatId, "❌ Введи число."); return true; }
      updateVal = num;
    }

    await supabase().from("shop_products").update({ [dbField]: updateVal, updated_at: new Date().toISOString() }).eq("id", productId);
    await logAction(shopId, chatId, `Товар изменён: ${field}`, "product", productId);
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
    if (!lines.length) { await tg.send(chatId, "❌ Отправь хотя бы одну строку."); return true; }

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

    await logAction(shopId, chatId, `Инвентарь загружен: ${lines.length} шт`, "product", productId);
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
    if (val.length < 1 || val.length > 50) { await tg.send(chatId, "❌ От 1 до 50 символов."); return true; }
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
      await logAction(shopId, chatId, `Категория создана: ${sData.cat_name}`, "category");
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
    await logAction(shopId, chatId, `Категория изменена: ${field}`, "category", catId);
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

  // ─── Add promocode: code ──────────────────
  if (state === "s_addpromo_code") {
    if (val.length < 2 || val.length > 30) { await tg.send(chatId, "❌ Код: от 2 до 30 символов."); return true; }
    sData.promo_code = val.toUpperCase();
    await setSession(chatId, "s_addpromo_type", shopId, sData);
    await tg.send(chatId, "Выбери тип скидки:", ikb([
      [btn("📊 Процент (%)", `s:promotype:${shopId}:percent`)],
      [btn("💰 Фиксированная ($)", `s:promotype:${shopId}:fixed`)],
    ]));
    return true;
  }
  if (state === "s_addpromo_value") {
    const num = Number(val);
    if (isNaN(num) || num <= 0) { await tg.send(chatId, "❌ Введи положительное число."); return true; }
    if (sData.promo_type === "percent" && num > 100) { await tg.send(chatId, "❌ Процент не может быть больше 100."); return true; }
    sData.promo_value = num;
    await setSession(chatId, "s_addpromo_maxuses", shopId, sData);
    await tg.send(chatId, "🔢 Макс. кол-во использований (введи число или <code>-</code> для безлимита):");
    return true;
  }
  if (state === "s_addpromo_maxuses") {
    const maxUses = val === "-" ? null : Number(val);
    if (val !== "-" && (isNaN(maxUses as number) || (maxUses as number) < 1)) { await tg.send(chatId, "❌ Введи число или <code>-</code>."); return true; }

    const { data: newPromo, error } = await supabase().from("shop_promocodes").insert({
      shop_id: shopId,
      code: sData.promo_code as string,
      discount_type: sData.promo_type as string,
      discount_value: sData.promo_value as number,
      max_uses: maxUses,
      is_active: true,
    }).select("id, code").single();

    await clearSession(chatId);

    if (error) {
      const msg = error.message.includes("unique") ? "Такой код уже существует." : error.message;
      await tg.send(chatId, `❌ Ошибка: ${msg}`, ikb([[btn("◀️ Промокоды", `s:promos:${shopId}:0`)]]));
    } else {
      await logAction(shopId, chatId, `Промокод создан: ${newPromo?.code}`, "promocode", newPromo?.id);
      await tg.send(chatId, `✅ Промокод <code>${esc(newPromo?.code || "")}</code> создан!`, ikb([[btn("◀️ Промокоды", `s:promos:${shopId}:0`)]]));
    }
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
  if (cmd === "broadcast") return showBroadcast(tg, chatId, msgId, parts[2]);

  // ─── Orders ───────────────────────────────
  if (cmd === "orders") return showOrders(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
  if (cmd === "order") return showOrder(tg, chatId, msgId, parts[2], parts[3]);
  if (cmd === "orderstatus") {
    const sid = parts[2];
    const orderId = parts[3];
    const newStatus = parts[4];
    await supabase().from("shop_orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
    await logAction(sid, chatId, `Заказ ${newStatus}`, "order", orderId);
    return showOrder(tg, chatId, msgId, sid, orderId);
  }

  // ─── Users ────────────────────────────────
  if (cmd === "users") return showUsers(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
  if (cmd === "user") return showUser(tg, chatId, msgId, parts[2], parts[3]);

  // ─── Promocodes ───────────────────────────
  if (cmd === "promos") return showPromos(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);
  if (cmd === "promo") return showPromo(tg, chatId, msgId, parts[2], parts[3]);
  if (cmd === "addpromo") {
    const sid = parts[2];
    await setSession(chatId, "s_addpromo_code", sid, {});
    return tg.edit(chatId, msgId, "🏷 <b>Новый промокод</b>\n\nВведи код промокода (напр: SALE20):", ikb([[btn("❌ Отмена", `s:promos:${sid}:0`)]]));
  }
  if (cmd === "promotype") {
    const sid = parts[2];
    const type = parts[3]; // percent or fixed
    const session = await getSession(chatId, sid);
    if (!session) return;
    const sData = { ...(session.data || {}), promo_type: type };
    await setSession(chatId, "s_addpromo_value", sid, sData);
    const label = type === "percent" ? "процент скидки (1-100)" : "сумму скидки в USD";
    return tg.edit(chatId, msgId, `💰 Введи ${label}:`, ikb([[btn("❌ Отмена", `s:promos:${sid}:0`)]]));
  }
  if (cmd === "togglepromo") {
    const sid = parts[2];
    const promoId = parts[3];
    const { data: pr } = await supabase().from("shop_promocodes").select("is_active, code").eq("id", promoId).single();
    if (pr) {
      await supabase().from("shop_promocodes").update({ is_active: !pr.is_active }).eq("id", promoId);
      await logAction(sid, chatId, `Промокод ${pr.is_active ? "деактивирован" : "активирован"}: ${pr.code}`, "promocode", promoId);
    }
    return showPromo(tg, chatId, msgId, sid, promoId);
  }
  if (cmd === "delpromo") {
    const sid = parts[2];
    const promoId = parts[3];
    return tg.edit(chatId, msgId, "🗑 Удалить этот промокод?\n\n⚠️ Это действие необратимо.", ikb([
      [btn("🗑 Да, удалить", `s:confirmdelpromo:${sid}:${promoId}`), btn("❌ Нет", `s:promo:${sid}:${promoId}`)],
    ]));
  }
  if (cmd === "confirmdelpromo") {
    const sid = parts[2];
    const promoId = parts[3];
    const { data: pr } = await supabase().from("shop_promocodes").select("code").eq("id", promoId).single();
    await supabase().from("shop_promocodes").delete().eq("id", promoId);
    await logAction(sid, chatId, `Промокод удалён: ${pr?.code || promoId}`, "promocode", promoId);
    return tg.edit(chatId, msgId, "✅ Промокод удалён.", ikb([[btn("◀️ Промокоды", `s:promos:${sid}:0`)]]));
  }

  // ─── Logs ─────────────────────────────────
  if (cmd === "logs") return showLogs(tg, chatId, msgId, parts[2], parseInt(parts[3]) || 0);

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
    const { data: pr } = await supabase().from("shop_products").select("is_active, name").eq("id", productId).single();
    if (pr) {
      await supabase().from("shop_products").update({ is_active: !pr.is_active, updated_at: new Date().toISOString() }).eq("id", productId);
      await logAction(sid, chatId, `Товар ${pr.is_active ? "скрыт" : "показан"}: ${pr.name}`, "product", productId);
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
    const { data: pr } = await supabase().from("shop_products").select("name").eq("id", productId).single();
    await supabase().from("shop_inventory").delete().eq("product_id", productId);
    await supabase().from("shop_products").delete().eq("id", productId);
    await logAction(sid, chatId, `Товар удалён: ${pr?.name || productId}`, "product", productId);
    return tg.edit(chatId, msgId, "✅ Товар удалён.", ikb([[btn("◀️ Товары", `s:products:${sid}:0`)]]));
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
      `Примеры:\n<code>login:password</code>\n<code>XXXX-XXXX-XXXX-XXXX</code>\n<code>https://drive.google.com/file/...</code>`,
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
    const { data: cat } = await supabase().from("shop_categories").select("is_active, name").eq("id", catId).single();
    if (cat) {
      await supabase().from("shop_categories").update({ is_active: !cat.is_active }).eq("id", catId);
      await logAction(sid, chatId, `Категория ${cat.is_active ? "скрыта" : "показана"}: ${cat.name}`, "category", catId);
    }
    return showCategory(tg, chatId, msgId, sid, catId);
  }

  // ─── Delete category ──────────────────────
  if (cmd === "delcat") {
    const sid = parts[2];
    const catId = parts[3];
    const { data: cat } = await supabase().from("shop_categories").select("name").eq("id", catId).single();
    await supabase().from("shop_categories").delete().eq("id", catId);
    await logAction(sid, chatId, `Категория удалена: ${cat?.name || catId}`, "category", catId);
    return tg.edit(chatId, msgId, "✅ Категория удалена.", ikb([[btn("◀️ Категории", `s:cats:${sid}:0`)]]));
  }

  // ─── Approve/reject review ────────────────
  if (cmd === "approvereview") {
    const sid = parts[2];
    const reviewId = parts[3];
    await supabase().from("shop_reviews").update({ moderation_status: "approved", verified: true }).eq("id", reviewId);
    await logAction(sid, chatId, "Отзыв одобрен", "review", reviewId);
    return showReviews(tg, chatId, msgId, sid);
  }
  if (cmd === "rejectreview") {
    const sid = parts[2];
    const reviewId = parts[3];
    await supabase().from("shop_reviews").update({ moderation_status: "rejected" }).eq("id", reviewId);
    await logAction(sid, chatId, "Отзыв отклонён", "review", reviewId);
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

    await logAction(sid, chatId, `Рассылка: ${sent} отправлено, ${failed} ошибок`, "broadcast");

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
        const isOwner = await isShopOwner(shopId, chatId);
        if (!isOwner) {
          await tg.answer(cb.id, "⛔ Нет доступа");
          return new Response("ok");
        }
        try {
          await handleCallback(tg, chatId, msgId, data, cb.id, shopId);
        } catch (cbErr) {
          console.error("seller-bot-webhook: callback error:", cbErr, "data:", data);
          try { await tg.answer(cb.id, "❌ Ошибка обработки"); } catch {}
        }
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

      await tg.send(chatId, greeting, {
        inline_keyboard: [
          [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
          ...(supportUrl ? [[{ text: "🆘 Поддержка", url: supportUrl }]] : []),
        ],
      });
      return new Response("ok");
    }

    // ─── /help ──────────────────────────────
    if (text === "/help") {
      const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
      const supportUrl = shop.support_link
        ? (shop.support_link.startsWith("http") ? shop.support_link : `https://${shop.support_link}`)
        : null;

      await tg.send(chatId,
        `ℹ️ <b>${esc(shop.name)}</b>\n\nЭто бот магазина ${esc(shop.name)}.\nНажмите кнопку ниже чтобы открыть витрину.`,
        {
          inline_keyboard: [
            [{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }],
            ...(supportUrl ? [[{ text: "🆘 Поддержка", url: supportUrl }]] : []),
          ],
        },
      );
      return new Response("ok");
    }

    // ─── Default ────────────────────────────
    const shopUrl = `${WEBAPP_DOMAIN}/shop/${shop.id}`;
    await tg.send(chatId, `Используйте кнопку ниже для перехода в магазин 👇`, {
      inline_keyboard: [[{ text: "🛍 Открыть магазин", web_app: { url: shopUrl } }]],
    });

    return new Response("ok");
  } catch (e) {
    console.error("seller-bot-webhook error:", e);
    return new Response("error", { status: 500 });
  }
});
