import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telegramId, rating, text, author } = await req.json();

    if (!telegramId || !rating || !text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already has a review
    const { count: existingCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", telegramId);

    if (existingCount && existingCount > 0) {
      return new Response(
        JSON.stringify({ error: "Вы уже оставили отзыв" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for avatar
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("photo_url, first_name, last_name")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    // Get a random product to associate review with (general store review)
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    const productId = products?.[0]?.id;
    if (!productId) {
      return new Response(
        JSON.stringify({ error: "No products available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = profile
      ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
      : (author || "Пользователь");

    const { error } = await supabase.from("reviews").insert({
      telegram_id: telegramId,
      rating: Math.min(5, Math.max(1, rating)),
      text: text.slice(0, 1000),
      author: displayName,
      avatar: profile?.photo_url || "",
      product_id: productId,
      verified: false,
      moderation_status: "pending",
    });

    if (error) {
      console.error("Review insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Submit review error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
