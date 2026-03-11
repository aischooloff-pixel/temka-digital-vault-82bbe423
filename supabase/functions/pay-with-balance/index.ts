import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

  const authDate = params.get("auth_date");
  if (authDate) {
    const now = Math.floor(Date.now() / 1000);
    if (now - Number(authDate) > 300) return null;
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
    const { initData, orderNumber, items, promoCode } = await req.json();

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

    if (!orderNumber || !items?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Verify user & balance ───────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("balance, is_blocked")
      .eq("telegram_id", telegramUserId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.is_blocked) {
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
          JSON.stringify({ error: `Товар "${item.productTitle || 'Unknown'}" не найден` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (product.stock < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Товар "${product.title}" — недостаточно на складе` }),
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

    // ─── Validate balance covers total ────────────
    const serverBalance = Number(profile.balance);
    if (serverBalance < totalAfterDiscount) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const balanceUsed = totalAfterDiscount;

    // ─── Create order ────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        telegram_id: telegramUserId,
        status: "paid",
        payment_status: "paid",
        total_amount: serverTotal,
        currency: "USD",
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

    // Create order items
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_title: item.productTitle,
      product_price: item.productPrice,
      quantity: item.quantity,
    }));
    await supabase.from("order_items").insert(orderItems);

    // ─── Deduct balance ──────────────────────────
    const newBalance = serverBalance - balanceUsed;
    await supabase
      .from("user_profiles")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("telegram_id", telegramUserId);

    await supabase.from("balance_history").insert({
      telegram_id: telegramUserId,
      amount: -balanceUsed,
      balance_after: newBalance,
      type: "purchase",
      comment: `Заказ ${orderNumber}`,
      admin_telegram_id: telegramUserId,
    });

    // Increment promo used_count
    if (validatedPromoCode) {
      const { data: promo } = await supabase
        .from("promocodes")
        .select("id, used_count")
        .eq("code", validatedPromoCode)
        .maybeSingle();
      if (promo) {
        await supabase
          .from("promocodes")
          .update({ used_count: (promo.used_count || 0) + 1 })
          .eq("id", promo.id);
      }
    }

    // ─── Auto-deliver inventory items ─────────────
    const { data: oItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, product_title")
      .eq("order_id", order.id);

    const deliveredContent: string[] = [];
    let allDelivered = true;

    if (oItems) {
      for (const item of oItems) {
        const { data: invItems } = await supabase
          .from("inventory_items")
          .select("id, content")
          .eq("product_id", item.product_id)
          .eq("status", "available")
          .limit(item.quantity);

        if (invItems && invItems.length > 0) {
          const deliveredCount = Math.min(invItems.length, item.quantity);
          const ids = invItems.slice(0, deliveredCount).map(i => i.id);

          await supabase
            .from("inventory_items")
            .update({ status: "sold", order_id: order.id, sold_at: new Date().toISOString() })
            .in("id", ids);

          deliveredContent.push(
            `📦 <b>${item.product_title}</b> (×${deliveredCount}):\n` +
            invItems.slice(0, deliveredCount).map(i => `<code>${i.content}</code>`).join("\n")
          );

          const { count: remaining } = await supabase
            .from("inventory_items")
            .select("id", { count: "exact", head: true })
            .eq("product_id", item.product_id)
            .eq("status", "available");

          await supabase
            .from("products")
            .update({ stock: remaining || 0, updated_at: new Date().toISOString() })
            .eq("id", item.product_id);

          if (deliveredCount < item.quantity) allDelivered = false;
        } else {
          allDelivered = false;
        }
      }
    }

    // Update order status
    const finalStatus = allDelivered && deliveredContent.length > 0 ? "delivered" : "paid";
    if (finalStatus !== "paid") {
      await supabase
        .from("orders")
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq("id", order.id);
    }

    // Send TG notification
    if (botToken) {
      let message = `✅ <b>Оплата балансом подтверждена!</b>\n\n📦 Заказ: <code>${orderNumber}</code>\n💰 Списано: $${Number(balanceUsed).toFixed(2)}\n`;

      if (deliveredContent.length > 0) {
        message += `\n🎁 <b>Ваши товары:</b>\n\n${deliveredContent.join("\n\n")}\n\n⚠️ Сохраните данные!`;
      } else {
        message += `\nВаш товар будет доставлен в ближайшее время.`;
      }

      message += `\n\nСпасибо за покупку!`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramUserId, text: message, parse_mode: "HTML" }),
      });
    }

    return new Response(
      JSON.stringify({ ok: true, orderNumber, orderId: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pay with balance error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
