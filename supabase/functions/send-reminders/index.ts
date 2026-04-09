import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC_KEY =
  "BGDTko-k3Y8yilEDC6iEmfmE0Zcn-U59j2hTdZK2k8-sUwAVb0HzPjCH1AR73_Siq92QWsDseGef0_eQwzl0-UQ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    console.log("send-reminders env check", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasVapidPrivateKey: !!vapidPrivateKey,
    });

    if (!supabaseUrl || !serviceRoleKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "Missing required backend secrets" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert to URL-safe Base64: strip padding, replace +/ with -_
    const cleanPrivateKey = vapidPrivateKey.trim()
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    webpush.setVapidDetails(
      "mailto:noreply@example.com",
      VAPID_PUBLIC_KEY,
      cleanPrivateKey
    );

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    // Convert to IST (UTC+5:30) since reminder times are stored in local Indian time
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const currentTime = `${String(istNow.getUTCHours()).padStart(2, "0")}:${String(
      istNow.getUTCMinutes()
    ).padStart(2, "0")}`;

    console.log("Checking reminders for time:", currentTime);

    const { data: dueTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, user_id, reminder_time")
      .eq("completed", false)
      .eq("reminder_time", currentTime);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return new Response(JSON.stringify({ error: tasksError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueTasks || dueTasks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders due", time: currentTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${dueTasks.length} tasks due at ${currentTime}`);

    let sent = 0;
    let errors = 0;

    for (const task of dueTasks) {
      const { data: subs, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", task.user_id);

      if (subsError) {
        console.error("Failed to load subscriptions", {
          userId: task.user_id,
          error: subsError.message,
        });
        errors++;
        continue;
      }

      if (!subs || subs.length === 0) {
        console.log(`No push subscriptions for user ${task.user_id}`);
        continue;
      }

      const payload = JSON.stringify({
        title: "⏰ Task Reminder",
        body: `Time for: ${task.title}`,
        tag: `task-${task.id}`,
        url: "/",
      });

      for (const sub of subs) {
        try {
          const response = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            { TTL: 86400, urgency: "high" }
          );

          sent++;
          console.log("Push sent", {
            endpoint: sub.endpoint.slice(0, 80),
            statusCode: response.statusCode,
          });
        } catch (err: any) {
          const statusCode = err?.statusCode ?? err?.status;
          const responseBody = err?.body || err?.message || String(err);

          if (statusCode === 410 || statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            console.log("Removed expired subscription", {
              endpoint: sub.endpoint.slice(0, 80),
              statusCode,
            });
          } else {
            console.error("Push delivery failed", {
              endpoint: sub.endpoint.slice(0, 80),
              statusCode,
              responseBody,
              headers: err?.headers,
            });
            errors++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sent} notifications (${errors} errors)`,
        time: currentTime,
        tasksMatched: dueTasks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
