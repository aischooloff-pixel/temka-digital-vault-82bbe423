import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

  const userStr = params.get("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, action, orderId } = await req.json();

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) return jsonRes({ error: "Not configured" }, 500);
    if (!initData) return jsonRes({ error: "Authentication required" }, 401);

    const tgUser = verifyAndExtractUser(initData, botToken);
    if (!tgUser) return jsonRes({ error: "Invalid authentication" }, 401);

    const telegramId = tgUser.id;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (action) {
      case "profile": {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("balance, role, is_blocked")
          .eq("telegram_id", telegramId)
          .maybeSingle();
        return jsonRes({ profile });
      }

      case "orders": {
        const { data: orders } = await supabase
          .from("orders")
          .select("*")
          .eq("telegram_id", telegramId)
          .order("created_at", { ascending: false });
        return jsonRes({ orders: orders || [] });
      }

      case "order-items": {
        if (!orderId) return jsonRes({ error: "Missing orderId" }, 400);
        // Verify order belongs to this user
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("id", orderId)
          .eq("telegram_id", telegramId)
          .maybeSingle();
        if (!order) return jsonRes({ error: "Order not found" }, 404);

        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);
        return jsonRes({ items: items || [] });
      }

      case "order-inventory": {
        if (!orderId) return jsonRes({ error: "Missing orderId" }, 400);
        // Verify order belongs to this user
        const { data: order } = await supabase
          .from("orders")
          .select("id, status")
          .eq("id", orderId)
          .eq("telegram_id", telegramId)
          .maybeSingle();
        if (!order) return jsonRes({ error: "Order not found" }, 404);

        // Only return inventory for delivered/completed orders
        if (!["delivered", "completed", "paid"].includes(order.status)) {
          return jsonRes({ items: [] });
        }

        const { data: items } = await supabase
          .from("inventory_items")
          .select("id, content, status, sold_at")
          .eq("order_id", orderId);
        return jsonRes({ items: items || [] });
      }

      case "balance-history": {
        const { data: history } = await supabase
          .from("balance_history")
          .select("*")
          .eq("telegram_id", telegramId)
          .order("created_at", { ascending: false });
        return jsonRes({ history: history || [] });
      }

      case "stats": {
        const { data: orders } = await supabase
          .from("orders")
          .select("total_amount, status")
          .eq("telegram_id", telegramId);
        const paid = (orders || []).filter(o =>
          ["paid", "processing", "delivered", "completed"].includes(o.status)
        );
        return jsonRes({
          stats: {
            orderCount: (orders || []).length,
            totalSpent: paid.reduce((s, o) => s + Number(o.total_amount), 0),
          },
        });
      }

      default:
        return jsonRes({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Get my data error:", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
