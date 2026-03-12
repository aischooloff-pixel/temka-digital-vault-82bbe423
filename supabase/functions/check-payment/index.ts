import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";
const TOPUP_COMMENT_PREFIX = "Пополнение через CryptoBot";

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function topupComment(invoiceId: string) {
  return `${TOPUP_COMMENT_PREFIX} (invoice:${invoiceId})`;
}

function verifyAndExtractUser(initData: string, botToken: string): { id: number } | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dcs = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  if (createHmac("sha256", secretKey).update(dcs).digest("hex") !== hash) return null;
  const authDate = params.get("auth_date");
  if (authDate && Math.floor(Date.now() / 1000) - Number(authDate) > 600) return null;
  try { return JSON.parse(params.get("user") || ""); } catch { return null; }
}

async function resolveShopByHint(supabase: any, shopHint?: string) {
  if (!shopHint) return null;
  const normalized = String(shopHint).trim();
  if (!normalized) return null;
  const { data: byId } = await supabase.from("shops").select("id, bot_token_encrypted, cryptobot_token_encrypted").eq("id", normalized).maybeSingle();
  if (byId) return byId;
  const { data: bySlug } = await supabase.from("shops").select("id, bot_token_encrypted, cryptobot_token_encrypted").eq("slug", normalized).maybeSingle();
  return bySlug || null;
}

async function resolveTokens(supabase: any, shopHint?: string) {
  if (!shopHint) {
    return {
      botToken: Deno.env.get("TELEGRAM_BOT_TOKEN") || null,
      cryptobotToken: Deno.env.get("CRYPTOBOT_API_TOKEN") || null,
      resolvedShopId: undefined as string | undefined,
    };
  }
  const ek = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!ek) throw new Error("Server config error");
  const shop = await resolveShopByHint(supabase, shopHint);
  if (!shop) throw new Error("Shop not found");
  const decrypt = async (enc: string | null) => {
    if (!enc) return null;
    const { data } = await supabase.rpc("decrypt_token", { p_encrypted: enc, p_key: ek });
    return data || null;
  };
  return {
    botToken: await decrypt(shop.bot_token_encrypted),
    cryptobotToken: await decrypt(shop.cryptobot_token_encrypted),
    resolvedShopId: shop.id as string,
  };
}

async function notifyTopup(botToken: string | null, telegramId: number, amount: number, newBalance: number, invoiceId: string) {
  if (!botToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId, parse_mode: "HTML",
        text: `✅ <b>Баланс пополнен!</b>\n\n💰 Сумма: $${amount.toFixed(2)}\n💳 Новый баланс: $${Number(newBalance).toFixed(2)}`,
      }),
    });
  } catch (e) {
    console.error(`[check-payment] notification exception invoice=${invoiceId}:`, e);
  }
}

async function hasTopupLedgerRecord(supabase: any, table: string, invoiceId: string, telegramId: number, amount: number, processedAt?: string | null, shopId?: string | null) {
  let query = supabase.from(table).select("id", { count: "exact", head: true })
    .eq("telegram_id", telegramId).eq("type", "credit").ilike("comment", `%invoice:${invoiceId}%`);
  if (shopId && table === "shop_balance_history") query = query.eq("shop_id", shopId);
  const { count: taggedCount } = await query;
  if ((taggedCount || 0) > 0) return true;

  if (!processedAt) return false;
  const center = new Date(processedAt).getTime();
  if (!Number.isFinite(center)) return false;
  const from = new Date(center - 15 * 60 * 1000).toISOString();
  const to = new Date(center + 15 * 60 * 1000).toISOString();

  let fbQuery = supabase.from(table).select("id", { count: "exact", head: true })
    .eq("telegram_id", telegramId).eq("type", "credit").eq("amount", amount)
    .gte("created_at", from).lte("created_at", to);
  if (shopId && table === "shop_balance_history") fbQuery = fbQuery.eq("shop_id", shopId);
  const { count: fallbackCount } = await fbQuery;
  return (fallbackCount || 0) > 0;
}

async function markTopupProcessed(supabase: any, invoiceId: string, telegramId: number, amount: number, hasExistingRow: boolean) {
  if (hasExistingRow) {
    await supabase.from("processed_invoices").update({
      type: "topup", order_id: null, telegram_id: telegramId, amount, processed_at: new Date().toISOString(),
    }).eq("invoice_id", invoiceId);
    return;
  }
  await supabase.from("processed_invoices").insert({
    invoice_id: invoiceId, type: "topup", order_id: null, telegram_id: telegramId, amount,
  });
}

async function processPaidTopup(params: {
  supabase: any;
  tokens: { botToken: string | null };
  invoice: any;
  payload: any;
  telegramId: number;
  shopId?: string | null;
}) {
  const { supabase, tokens, invoice, payload, telegramId, shopId } = params;
  const invoiceId = String(invoice.invoice_id);
  const topupAmount = Number(payload.amount ?? invoice.amount ?? 0);
  if (!topupAmount || topupAmount <= 0) throw new Error("Invalid invoice amount");

  const { data: existingProcessed } = await supabase.from("processed_invoices")
    .select("invoice_id, type, processed_at").eq("invoice_id", invoiceId).maybeSingle();

  const isShopTopup = !!shopId;
  const historyTable = isShopTopup ? "shop_balance_history" : "balance_history";

  const alreadyCredited = await hasTopupLedgerRecord(supabase, historyTable, invoiceId, telegramId, topupAmount, existingProcessed?.processed_at || null, shopId);

  if (alreadyCredited) {
    if (!existingProcessed || existingProcessed.type !== "topup") {
      await markTopupProcessed(supabase, invoiceId, telegramId, topupAmount, Boolean(existingProcessed));
    }
    return { topupStatus: "paid", paymentStatus: "paid", amount: topupAmount };
  }

  // Credit balance — tenant-scoped
  let newBalance: number;
  if (isShopTopup) {
    const { data: nb, error: balanceError } = await supabase.rpc("shop_credit_balance", {
      p_shop_id: shopId, p_telegram_id: telegramId, p_amount: topupAmount,
    });
    if (balanceError) throw new Error(`shop_credit_balance failed: ${balanceError.message}`);
    newBalance = nb;
    await supabase.from("shop_balance_history").insert({
      shop_id: shopId, telegram_id: telegramId, amount: topupAmount, balance_after: newBalance,
      type: "credit", comment: topupComment(invoiceId), admin_telegram_id: telegramId,
    });
  } else {
    const { data: nb, error: balanceError } = await supabase.rpc("credit_balance", {
      p_telegram_id: telegramId, p_amount: topupAmount,
    });
    if (balanceError) throw new Error(`credit_balance failed: ${balanceError.message}`);
    newBalance = nb;
    await supabase.from("balance_history").insert({
      telegram_id: telegramId, amount: topupAmount, balance_after: newBalance,
      type: "credit", comment: topupComment(invoiceId), admin_telegram_id: telegramId,
    });
  }

  await notifyTopup(tokens.botToken, telegramId, topupAmount, Number(newBalance) || 0, invoiceId);
  await markTopupProcessed(supabase, invoiceId, telegramId, topupAmount, Boolean(existingProcessed));

  return { topupStatus: "paid", paymentStatus: "paid", amount: topupAmount, balance: newBalance };
}

async function checkTopupPayment(params: {
  supabase: any;
  tokens: { botToken: string | null; cryptobotToken: string | null };
  invoiceId: string;
  telegramId: number;
  shopId?: string;
}) {
  const { supabase, tokens, invoiceId, telegramId, shopId } = params;
  if (!tokens.cryptobotToken) return jsonRes({ topupStatus: "awaiting", paymentStatus: "awaiting" });

  const response = await fetch(`${CRYPTOBOT_API_URL}/getInvoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Crypto-Pay-API-Token": tokens.cryptobotToken },
    body: JSON.stringify({ invoice_ids: invoiceId }),
  });

  const data = await response.json();
  if (!data.ok || !data.result?.items?.length) return jsonRes({ topupStatus: "awaiting", paymentStatus: "awaiting" });

  const invoice = data.result.items[0];
  let payload: any = {};
  try { payload = JSON.parse(invoice.payload || "{}"); } catch {}

  if (payload.type !== "topup") return jsonRes({ error: "Invalid invoice type" }, 400);
  if (Number(payload.telegramUserId) !== telegramId) return jsonRes({ error: "Invoice owner mismatch" }, 403);
  if (shopId && (payload.shopId || null) !== shopId) return jsonRes({ error: "Invoice shop mismatch" }, 403);

  if (invoice.status === "paid") {
    try {
      const result = await processPaidTopup({ supabase, tokens, invoice, payload, telegramId, shopId });
      return jsonRes(result);
    } catch (error) {
      console.error(`[check-payment] topup processing error invoice=${invoiceId}:`, error);
      return jsonRes({ error: "Failed to process topup" }, 500);
    }
  }

  if (invoice.status === "expired") return jsonRes({ topupStatus: "expired", paymentStatus: "expired" });
  return jsonRes({ topupStatus: invoice.status || "awaiting", paymentStatus: "awaiting" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, invoiceId, initData, shopId } = await req.json();
    const isShop = !!shopId;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let tokens;
    try { tokens = await resolveTokens(supabase, shopId); }
    catch (e) { return jsonRes({ error: (e as Error).message }, 500); }

    if (!tokens.botToken) return jsonRes({ error: "Not configured" }, 500);
    if (!initData) return jsonRes({ error: "Authentication required" }, 401);

    const tgUser = verifyAndExtractUser(initData, tokens.botToken);
    if (!tgUser) return jsonRes({ error: "Invalid authentication" }, 401);

    if (!orderId && !invoiceId) return jsonRes({ error: "Missing orderId or invoiceId" }, 400);

    if (invoiceId) {
      return await checkTopupPayment({
        supabase, tokens, invoiceId: String(invoiceId),
        telegramId: tgUser.id, shopId: tokens.resolvedShopId || shopId,
      });
    }

    // Get order from correct table
    const orderTable = isShop ? "shop_orders" : "orders";
    const telegramCol = isShop ? "buyer_telegram_id" : "telegram_id";

    const { data: order, error: orderError } = await supabase
      .from(orderTable).select("*").eq("id", orderId).eq(telegramCol, tgUser.id).single();
    if (orderError || !order) return jsonRes({ error: "Order not found" }, 404);

    if (order.payment_status === "paid") return jsonRes({ status: order.status, paymentStatus: "paid" });
    if (!order.invoice_id) return jsonRes({ status: order.status, paymentStatus: order.payment_status });
    if (!tokens.cryptobotToken) return jsonRes({ status: order.status, paymentStatus: order.payment_status });

    // Poll CryptoBot
    const response = await fetch(`${CRYPTOBOT_API_URL}/getInvoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Crypto-Pay-API-Token": tokens.cryptobotToken },
      body: JSON.stringify({ invoice_ids: order.invoice_id }),
    });
    const data = await response.json();
    if (!data.ok || !data.result?.items?.length)
      return jsonRes({ status: order.status, paymentStatus: order.payment_status });

    const invoice = data.result.items[0];
    const telegramId = isShop ? order.buyer_telegram_id : order.telegram_id;
    const resolvedShopId = tokens.resolvedShopId || shopId;

    if (invoice.status === "paid" && order.payment_status !== "paid") {
      // Idempotency
      const { error: dedupError } = await supabase.from("processed_invoices").insert({
        invoice_id: String(invoice.invoice_id), type: "payment", order_id: orderId,
        telegram_id: telegramId, amount: Number(invoice.amount) || 0,
      });
      if (dedupError) return jsonRes({ status: "paid", paymentStatus: "paid" });

      const { data: updatedRows } = await supabase.from(orderTable)
        .update({ status: "paid", payment_status: "paid", updated_at: new Date().toISOString() })
        .eq("id", orderId).neq("payment_status", "paid").select("id");
      if (!updatedRows?.length) return jsonRes({ status: "paid", paymentStatus: "paid" });

      // Promo increment
      if (order.promo_code) {
        if (isShop) {
          await supabase.rpc("increment_shop_promo_usage", { p_shop_id: resolvedShopId, p_code: order.promo_code });
        } else {
          await supabase.rpc("increment_promo_usage", { p_code: order.promo_code });
        }
      }

      // Balance deduction — tenant-scoped
      const balanceUsed = Number(order.balance_used || 0);
      if (balanceUsed > 0) {
        if (isShop) {
          const { data: nb, error: be } = await supabase.rpc("shop_deduct_balance", {
            p_shop_id: resolvedShopId, p_telegram_id: telegramId, p_amount: balanceUsed,
          });
          if (!be) {
            const promoInfo = order.promo_code ? ` (промо ${order.promo_code}, скидка $${Number(order.discount_amount || 0).toFixed(2)})` : "";
            await supabase.from("shop_balance_history").insert({
              shop_id: resolvedShopId, telegram_id: telegramId, amount: -balanceUsed, balance_after: nb,
              type: "purchase", comment: `Заказ ${order.order_number}${promoInfo}`, admin_telegram_id: telegramId,
            });
          }
        } else {
          const { data: nb, error: be } = await supabase.rpc("deduct_balance", {
            p_telegram_id: telegramId, p_amount: balanceUsed,
          });
          if (!be) {
            await supabase.from("balance_history").insert({
              telegram_id: telegramId, amount: -balanceUsed, balance_after: nb,
              type: "purchase", comment: `Заказ ${order.order_number}`, admin_telegram_id: telegramId,
            });
          }
        }
      }

      // Inventory reservation
      const itemsTable = isShop ? "shop_order_items" : "order_items";
      const titleCol = isShop ? "product_name" : "product_title";
      const reserveRpc = isShop ? "reserve_shop_inventory" : "reserve_inventory";
      const inventoryTable = isShop ? "shop_inventory" : "inventory_items";
      const productsTable = isShop ? "shop_products" : "products";

      const { data: orderItems } = await supabase.from(itemsTable).select(`product_id, quantity, ${titleCol}`).eq("order_id", orderId);
      const deliveredContent: string[] = [];
      let allDelivered = true;

      if (orderItems) {
        for (const item of orderItems) {
          const itemTitle = (item as any)[titleCol];
          const { data: reserved } = await supabase.rpc(reserveRpc, {
            p_product_id: item.product_id, p_quantity: item.quantity, p_order_id: orderId,
          });
          if (reserved?.length) {
            deliveredContent.push(`📦 <b>${itemTitle}</b> (×${reserved.length}):\n${reserved.map((i: any) => `<code>${i.content}</code>`).join("\n")}`);
            const { count: remaining } = await supabase.from(inventoryTable).select("id", { count: "exact", head: true })
              .eq("product_id", item.product_id).eq("status", "available");
            await supabase.from(productsTable).update({ stock: remaining || 0, updated_at: new Date().toISOString() }).eq("id", item.product_id);
            if (reserved.length < item.quantity) allDelivered = false;
          } else { allDelivered = false; }
        }
      }

      const finalStatus = allDelivered && deliveredContent.length > 0 ? "delivered" : "paid";
      if (finalStatus !== "paid") {
        await supabase.from(orderTable).update({ status: finalStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
      }

      // TG notification
      if (tokens.botToken) {
        let message = `✅ <b>Оплата подтверждена!</b>\n\n📦 Заказ: <code>${order.order_number}</code>\n💰 Сумма: ${invoice.amount} USD\n`;
        if (balanceUsed > 0) message += `💳 С баланса: $${balanceUsed.toFixed(2)}\n`;
        if (deliveredContent.length > 0) {
          message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные!`;
        } else { message += `\nВаш товар будет доставлен в ближайшее время.`; }
        message += `\n\nСпасибо за покупку!`;
        await fetch(`https://api.telegram.org/bot${tokens.botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegramId, text: message, parse_mode: "HTML" }),
        });
      }

      return jsonRes({ status: finalStatus, paymentStatus: "paid" });
    }

    if (invoice.status === "expired") {
      await supabase.from(orderTable).update({ status: "cancelled", payment_status: "expired", updated_at: new Date().toISOString() }).eq("id", orderId);
      return jsonRes({ status: "cancelled", paymentStatus: "expired" });
    }

    return jsonRes({ status: order.status, paymentStatus: order.payment_status, invoiceStatus: invoice.status });
  } catch (error) {
    console.error("Check payment error:", error);
    return jsonRes({ error: "Internal error" }, 500);
  }
});
