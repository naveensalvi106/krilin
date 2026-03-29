import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC_KEY =
  "BLpic-q0e4n0laKNA6mGXy9kkgV8zoaLZAyJprnWXY0yNTNDN9Wwg_aIbpOJzz44rDLy8j6991XtSAQPLZ37KYQ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ensure key is proper URL-safe base64 without padding
    const cleanPrivateKey = vapidPrivateKey
      .trim()
      .replace(/['"]/g, "")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/\s/g, "");

    console.log("VAPID private key length:", cleanPrivateKey.length, "chars:", cleanPrivateKey.slice(0, 5) + "...");

    webpush.setVapidDetails(
      "mailto:noreply@easyflow.app",
      VAPID_PUBLIC_KEY,
      cleanPrivateKey
    );

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current time as HH:MM in UTC
    const now = new Date();
    const currentTime = `${String(now.getUTCHours()).padStart(2, "0")}:${String(
      now.getUTCMinutes()
    ).padStart(2, "0")}`;

    console.log("Checking reminders for time:", currentTime);

    // Find tasks with reminders due now
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
      // Get all push subscriptions for this task's user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", task.user_id);

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
          await webpush.sendNotification(
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
          console.log(`Sent notification for task "${task.title}" to ${sub.endpoint.slice(0, 50)}...`);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired, clean up
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log("Removed expired subscription");
          } else {
            console.error(`Push failed for ${sub.endpoint.slice(0, 50)}:`, err.message || err);
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
