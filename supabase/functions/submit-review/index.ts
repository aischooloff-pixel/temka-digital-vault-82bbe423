import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const body = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // DELETE action
    if (body.action === "delete") {
      const { telegramId, reviewId } = body;
      if (!telegramId || !reviewId) return jsonRes({ error: "Missing fields" }, 400);

      // Verify the review belongs to this user
      const { data: review } = await supabase
        .from("reviews")
        .select("id, telegram_id")
        .eq("id", reviewId)
        .single();

      if (!review || review.telegram_id !== telegramId) {
        return jsonRes({ error: "Отзыв не найден" }, 404);
      }

      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // CREATE action (default)
    const { telegramId, rating, text, author, photoUrl } = body;

    if (!telegramId || !rating || !text) {
      return jsonRes({ error: "Missing required fields" }, 400);
    }

    // Check if user already has a review
    const { count: existingCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", telegramId);

    if (existingCount && existingCount > 0) {
      return jsonRes({ error: "Вы уже оставили отзыв" }, 400);
    }

    // Get user profile for avatar and name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("photo_url, first_name, last_name, username")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    // Get a product to associate review with
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    const productId = products?.[0]?.id;
    if (!productId) {
      return jsonRes({ error: "No products available" }, 400);
    }

    const displayName = profile
      ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
      : (author || "Пользователь");

    // Try to fetch avatar from TG API if not in profile
    let avatarUrl = photoUrl || profile?.photo_url || "";
    if (!avatarUrl) {
      try {
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken) {
          const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: telegramId, limit: 1 }),
          }).then(r => r.json());
          if (photosRes.ok && photosRes.result?.total_count > 0) {
            const fileId = photosRes.result.photos[0][0].file_id;
            const fileData = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ file_id: fileId }),
            }).then(r => r.json());
            if (fileData.ok) {
              avatarUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            }
          }
        }
      } catch (e) { console.error("Avatar fetch error:", e); }
    }

    const { error } = await supabase.from("reviews").insert({
      telegram_id: telegramId,
      rating: Math.min(5, Math.max(1, rating)),
      text: text.slice(0, 1000),
      author: displayName,
      avatar: avatarUrl,
      product_id: productId,
      verified: false,
      moderation_status: "pending",
    });

    if (error) {
      console.error("Review insert error:", error);
      return jsonRes({ error: error.message }, 500);
    }

    return jsonRes({ ok: true });
  } catch (error) {
    console.error("Submit review error:", error);
    return jsonRes({ error: error.message }, 500);
  }
});
