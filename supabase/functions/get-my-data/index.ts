import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  try { return JSON.parse(params.get("user") || ""); } catch { return null; }
}

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function resolveBotToken(supabase: any, shopId?: string): Promise<string | null> {
  if (!shopId) return Deno.env.get("TELEGRAM_BOT_TOKEN") || null;
  const ek = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!ek) return null;
  const { data: shop } = await supabase.from("shops").select("bot_token_encrypted").eq("id", shopId).maybeSingle();
  if (!shop?.bot_token_encrypted) return null;
  const { data } = await supabase.rpc("decrypt_token", { p_encrypted: shop.bot_token_encrypted, p_key: ek });
  return data || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { initData, action, orderId, shopId } = body;
    const isShop = !!shopId;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Public actions (no auth required)
    if (action === "shop-stats") {
      const [usersRes, ordersRes, productsRes, reviewsRes] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, status"),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("verified", true),
      ]);
      const orders = ordersRes.data || [];
      const completedOrders = orders.filter(o => ["paid", "completed", "delivered", "processing"].includes(o.status)).length;
      return jsonRes({
        stats: { users: usersRes.count || 0, completedOrders, totalOrders: orders.length, activeProducts: productsRes.count || 0, approvedReviews: reviewsRes.count || 0 },
      });
    }

    if (action === "check-promo-usage") {
      const { telegramId, code } = body;
      if (!telegramId || !code) return jsonRes({ count: 0 });
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("telegram_id", telegramId).eq("promo_code", code);
      return jsonRes({ count: count || 0 });
    }

    // Authenticated actions
    if (!initData) return jsonRes({ error: "Authentication required" }, 401);

    const botToken = await resolveBotToken(supabase, shopId);
    if (!botToken) return jsonRes({ error: "Bot not configured" }, 500);

    const tgUser = verifyAndExtractUser(initData, botToken);
    if (!tgUser) return jsonRes({ error: "Invalid authentication" }, 401);
    const telegramId = tgUser.id;

    switch (action) {
      case "profile": {
        const { data: profile } = await supabase.from("user_profiles")
          .select("balance, role, is_blocked").eq("telegram_id", telegramId).maybeSingle();
        return jsonRes({ profile });
      }

      case "orders": {
        if (isShop) {
          const { data: orders } = await supabase.from("shop_orders").select("*")
            .eq("buyer_telegram_id", telegramId).eq("shop_id", shopId)
            .order("created_at", { ascending: false });
          // Normalize to DbOrder shape
          const normalized = (orders || []).map((o: any) => ({
            id: o.id, order_number: o.order_number, telegram_id: o.buyer_telegram_id,
            status: o.status, payment_status: o.payment_status, total_amount: o.total_amount,
            currency: o.currency, invoice_id: o.invoice_id, pay_url: o.pay_url,
            notes: null, discount_amount: 0, promo_code: null, balance_used: o.balance_used || 0,
            created_at: o.created_at, updated_at: o.updated_at,
          }));
          return jsonRes({ orders: normalized });
        }
        const { data: orders } = await supabase.from("orders").select("*")
          .eq("telegram_id", telegramId).order("created_at", { ascending: false });
        return jsonRes({ orders: orders || [] });
      }

      case "order-items": {
        if (!orderId) return jsonRes({ error: "Missing orderId" }, 400);
        if (isShop) {
          const { data: order } = await supabase.from("shop_orders").select("id")
            .eq("id", orderId).eq("buyer_telegram_id", telegramId).eq("shop_id", shopId).maybeSingle();
          if (!order) return jsonRes({ error: "Order not found" }, 404);
          const { data: items } = await supabase.from("shop_order_items").select("*").eq("order_id", orderId);
          // Normalize product_name → product_title
          const normalized = (items || []).map((i: any) => ({
            id: i.id, order_id: i.order_id, product_id: i.product_id,
            product_title: i.product_name, product_price: i.product_price,
            quantity: i.quantity, created_at: i.created_at,
          }));
          return jsonRes({ items: normalized });
        }
        const { data: order } = await supabase.from("orders").select("id")
          .eq("id", orderId).eq("telegram_id", telegramId).maybeSingle();
        if (!order) return jsonRes({ error: "Order not found" }, 404);
        const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
        return jsonRes({ items: items || [] });
      }

      case "order-inventory": {
        if (!orderId) return jsonRes({ error: "Missing orderId" }, 400);
        if (isShop) {
          const { data: order } = await supabase.from("shop_orders").select("id, status")
            .eq("id", orderId).eq("buyer_telegram_id", telegramId).eq("shop_id", shopId).maybeSingle();
          if (!order) return jsonRes({ error: "Order not found" }, 404);
          if (!["delivered", "completed", "paid"].includes(order.status)) return jsonRes({ items: [] });
          const { data: items } = await supabase.from("shop_inventory").select("id, content, status, sold_at").eq("order_id", orderId);
          return jsonRes({ items: items || [] });
        }
        const { data: order } = await supabase.from("orders").select("id, status")
          .eq("id", orderId).eq("telegram_id", telegramId).maybeSingle();
        if (!order) return jsonRes({ error: "Order not found" }, 404);
        if (!["delivered", "completed", "paid"].includes(order.status)) return jsonRes({ items: [] });
        const { data: items } = await supabase.from("inventory_items").select("id, content, status, sold_at").eq("order_id", orderId);
        return jsonRes({ items: items || [] });
      }

      case "balance-history": {
        // Balance is global (platform-wide), no shop filtering
        const { data: history } = await supabase.from("balance_history").select("*")
          .eq("telegram_id", telegramId).order("created_at", { ascending: false });
        return jsonRes({ history: history || [] });
      }

      case "stats": {
        if (isShop) {
          const { data: orders } = await supabase.from("shop_orders").select("total_amount, status")
            .eq("buyer_telegram_id", telegramId).eq("shop_id", shopId);
          const paid = (orders || []).filter((o: any) => ["paid", "processing", "delivered", "completed"].includes(o.status));
          return jsonRes({ stats: { orderCount: (orders || []).length, totalSpent: paid.reduce((s: number, o: any) => s + Number(o.total_amount), 0) } });
        }
        const { data: orders } = await supabase.from("orders").select("total_amount, status").eq("telegram_id", telegramId);
        const paid = (orders || []).filter((o: any) => ["paid", "processing", "delivered", "completed"].includes(o.status));
        return jsonRes({ stats: { orderCount: (orders || []).length, totalSpent: paid.reduce((s: number, o: any) => s + Number(o.total_amount), 0) } });
      }

      default:
        return jsonRes({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Get my data error:", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
