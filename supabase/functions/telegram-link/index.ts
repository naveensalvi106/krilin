import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Enter a valid 6-digit code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = parsed.data;

    const { data: existingLink } = await supabase
      .from("telegram_user_links")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (existingLink) {
      return new Response(JSON.stringify({ error: "Telegram is already linked." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: matchedMessages, error: messageError } = await supabase
      .from("telegram_messages")
      .select("chat_id, raw_update, created_at")
      .eq("text", `LINK_CODE:${code}`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (messageError) {
      return new Response(JSON.stringify({ error: "Failed to verify code." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = matchedMessages?.[0];
    if (!message) {
      return new Response(JSON.stringify({ error: "Invalid code. Send /start to the bot first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = Number(message.raw_update?.chat_id ?? message.chat_id);
    const username = typeof message.raw_update?.username === "string" ? message.raw_update.username : null;

    const { data: duplicateChat } = await supabase
      .from("telegram_user_links")
      .select("id")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (duplicateChat) {
      return new Response(JSON.stringify({ error: "This Telegram account is already linked." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase
      .from("telegram_user_links")
      .insert({
        user_id: userData.user.id,
        chat_id: chatId,
        username,
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to link Telegram. Try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
