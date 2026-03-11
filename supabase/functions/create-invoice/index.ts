import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

// ─── Telegram initData verification ───────────
function verifyAndExtractUser(initData: string, botToken: string): { id: number; first_name: string } | null {
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

  // Check auth_date is not too old (5 minutes max for payment operations)
  const authDate = params.get("auth_date");
  if (authDate) {
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(authDate) > 300) return null; // 5 min expiry
  }

  const userStr = params.get("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, amount, currency, description, orderNumber, items, promoCode, balanceUsed: clientBalanceUsed } = await req.json();

    // ─── Validate initData ───────────────────────
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!initData) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tgUser = verifyAndExtractUser(initData, botToken);
    if (!tgUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramUserId = tgUser.id;

    // ─── Validate inputs ─────────────────────────
    if (!items?.length || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cryptobotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptobotToken) {
      return new Response(
        JSON.stringify({ error: "CryptoBot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Rate limiting ─────────────────────────
    await supabase.from("rate_limits").delete().lt("created_at", new Date(Date.now() - 3600000).toISOString());
    const { count: recentRequests } = await supabase
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", String(telegramUserId))
      .eq("action", "create_order")
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());

    if (recentRequests && recentRequests >= 15) {
      return new Response(
        JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("rate_limits").insert({
      identifier: String(telegramUserId),
      action: "create_order",
    });

    // ─── Check if user is blocked ────────────────
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("is_blocked, balance")
      .eq("telegram_id", telegramUserId)
      .maybeSingle();

    if (userProfile?.is_blocked) {
      return new Response(
        JSON.stringify({ error: "Ваш аккаунт заблокирован" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Server-side price calculation ────────────
    let serverTotal = 0;
    const validatedItems: { productId: string; productTitle: string; productPrice: number; quantity: number }[] = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0 || item.quantity > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid item data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: product } = await supabase
        .from("products")
        .select("id, title, price, stock, is_active")
        .eq("id", item.productId)
        .single();

      if (!product || !product.is_active) {
        return new Response(
          JSON.stringify({ error: `Товар "${item.productTitle || 'Unknown'}" не найден или неактивен` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (product.stock < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Товар "${product.title}" — недостаточно на складе (доступно: ${product.stock})` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const price = Number(product.price);
      serverTotal += price * item.quantity;
      validatedItems.push({
        productId: product.id,
        productTitle: product.title,
        productPrice: price,
        quantity: item.quantity,
      });
    }

    // ─── Server-side promo validation ─────────────
    let discountAmount = 0;
    let validatedPromoCode: string | null = null;

    if (promoCode) {
      const trimmedCode = String(promoCode).trim().toUpperCase();
      const { data: promo } = await supabase
        .from("promocodes")
        .select("*")
        .eq("code", trimmedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (promo) {
        const now = new Date().toISOString();
        const isValid =
          (!promo.valid_from || now >= promo.valid_from) &&
          (!promo.valid_until || now <= promo.valid_until) &&
          (promo.max_uses === null || promo.used_count < promo.max_uses);

        if (isValid) {
          // Check per-user limit
          let perUserOk = true;
          if (promo.max_uses_per_user) {
            const { count } = await supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("telegram_id", telegramUserId)
              .eq("promo_code", trimmedCode)
              .in("payment_status", ["paid", "awaiting"]);
            if (count !== null && count >= promo.max_uses_per_user) {
              perUserOk = false;
            }
          }

          if (perUserOk) {
            validatedPromoCode = trimmedCode;
            discountAmount = promo.discount_type === "percent"
              ? serverTotal * (Number(promo.discount_value) / 100)
              : Math.min(Number(promo.discount_value), serverTotal);
          }
        }
      }
    }

    const totalAfterDiscount = Math.max(0, serverTotal - discountAmount);

    // ─── Server-side balance validation ───────────
    const serverBalance = Number(userProfile?.balance || 0);
    const balanceUsed = Math.min(
      Math.max(0, Number(clientBalanceUsed) || 0),
      serverBalance,
      totalAfterDiscount
    );

    const toPay = Math.max(0, totalAfterDiscount - balanceUsed);

    if (toPay <= 0) {
      return new Response(
        JSON.stringify({ error: "Use pay-with-balance endpoint for full balance payments" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Create order ────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        telegram_id: telegramUserId,
        status: "pending",
        payment_status: "unpaid",
        total_amount: serverTotal,
        currency: currency || "USD",
        discount_amount: discountAmount,
        promo_code: validatedPromoCode,
        balance_used: balanceUsed,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items with server-validated prices
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_title: item.productTitle,
      product_price: item.productPrice,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      console.error("Order items error:", itemsError);
    }

    // ─── Create CryptoBot invoice ────────────────
    const response = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Crypto-Pay-API-Token": cryptobotToken,
      },
      body: JSON.stringify({
        currency_type: "fiat",
        fiat: currency || "USD",
        amount: String(toPay.toFixed(2)),
        description: description || "Заказ в магазине",
        payload: JSON.stringify({ orderId: order.id, orderNumber, telegramUserId, balanceUsed }),
        paid_btn_name: "callback",
        paid_btn_url: `https://t.me/${Deno.env.get("BOT_USERNAME") || "temkastore_bot"}`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      await supabase.from("orders").update({ status: "error" }).eq("id", order.id);
      console.error("CryptoBot API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.name || "Failed to create invoice" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with invoice info
    await supabase.from("orders").update({
      invoice_id: String(data.result.invoice_id),
      pay_url: data.result.pay_url,
      status: "awaiting_payment",
      payment_status: "awaiting",
    }).eq("id", order.id);

    return new Response(
      JSON.stringify({
        invoiceId: data.result.invoice_id,
        payUrl: data.result.pay_url,
        miniAppUrl: data.result.mini_app_invoice_url,
        status: data.result.status,
        amount: data.result.amount,
        currency: data.result.fiat,
        orderNumber: orderNumber,
        orderId: order.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Invoice creation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
