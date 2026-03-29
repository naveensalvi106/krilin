import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push utilities
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const publicKeyBytes = base64UrlToUint8Array(publicKeyB64);
  const privateKeyBytes = base64UrlToUint8Array(privateKeyB64);

  const publicKey = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    []
  );

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      y: btoa(String.fromCharCode(...publicKeyBytes.slice(33, 65)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      d: privateKeyB64,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );

  return { publicKey, privateKey };
}

async function createJWT(endpoint: string, vapidPrivateKey: CryptoKey, subject: string) {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const encoder = new TextEncoder();

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    vapidPrivateKey,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // DER encoded - parse it
    const r_len = sigBytes[3];
    const r = sigBytes.slice(4, 4 + r_len);
    const s_offset = 4 + r_len + 2;
    const s = sigBytes.slice(s_offset);
    rawSig = new Uint8Array(64);
    rawSig.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    rawSig.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  }

  const sigB64 = btoa(String.fromCharCode(...rawSig))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${unsignedToken}.${sigB64}`;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey
) {
  const jwt = await createJWT(subscription.endpoint, vapidPrivateKey, "mailto:noreply@lovable.app");

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      TTL: "86400",
    },
    body: new TextEncoder().encode(payload),
  });

  return response;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKeyB64 = "BGWS6V440AeIBkbjXbn1-LR9Qkag0ryitireNChNTKbxEou3qVxMGYfLrmkKM3oVuuxisVVC9WTZD4Xer2nrJSY";
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPrivateKeyB64) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current time as HH:MM
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Find tasks with reminders due now that aren't completed
    const { data: dueTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, user_id, reminder_time")
      .eq("completed", false)
      .eq("reminder_time", currentTime);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return new Response(JSON.stringify({ error: tasksError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueTasks || dueTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders due", time: currentTime }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { publicKey, privateKey } = await importVapidKeys(vapidPublicKeyB64, vapidPrivateKeyB64);

    let sent = 0;
    for (const task of dueTasks) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", task.user_id);

      if (!subs) continue;

      const payload = JSON.stringify({
        title: "⏰ Task Reminder",
        body: task.title,
        tag: `task-${task.id}`,
      });

      for (const sub of subs) {
        try {
          const res = await sendPushNotification(sub, payload, vapidPublicKeyB64, privateKey);
          if (res.ok) sent++;
          else if (res.status === 410 || res.status === 404) {
            // Subscription expired, clean up
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        } catch (err) {
          console.error("Push send error:", err);
        }
      }
    }

    return new Response(JSON.stringify({ message: `Sent ${sent} notifications`, time: currentTime }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
