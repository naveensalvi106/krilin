import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Crypto helpers for Web Push (RFC 8291 + RFC 8188) ----

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBuffers(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const b of bufs) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

async function createInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const header = encoder.encode("Content-Encoding: ");
  const nul = new Uint8Array([0]);

  return concatBuffers(
    header,
    typeBytes,
    nul,
    encoder.encode("P-256"),
    nul,
    new Uint8Array([0, clientPublicKey.length]),
    clientPublicKey,
    new Uint8Array([0, serverPublicKey.length]),
    serverPublicKey
  );
}

async function deriveKey(
  sharedSecret: ArrayBuffer,
  authSecret: Uint8Array,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Promise<{ contentEncryptionKey: CryptoKey; nonce: Uint8Array }> {
  const encoder = new TextEncoder();

  // PRK = HKDF-Extract(auth_secret, shared_secret)
  const prkKey = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  // IKM info
  const ikmInfo = concatBuffers(
    encoder.encode("WebPush: info\0"),
    clientPublicKey,
    serverPublicKey
  );

  // IKM = HKDF-Expand(PRK, ikm_info, 32)
  const ikmHmacKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const ikm = new Uint8Array(
    await crypto.subtle.sign("HMAC", ikmHmacKey, concatBuffers(ikmInfo, new Uint8Array([1])))
  ).slice(0, 32);

  // Final PRK
  const finalSalt = encoder.encode("Content-Encoding: aes128gcm\0");
  const finalPrkKey = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // CEK info and nonce info
  const cekInfo = concatBuffers(encoder.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1]));
  const nonceInfo = concatBuffers(encoder.encode("Content-Encoding: nonce\0"), new Uint8Array([1]));

  // Derive using HMAC-based HKDF
  const cekPrk = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const cekBytes = new Uint8Array(await crypto.subtle.sign("HMAC", cekPrk, cekInfo)).slice(0, 16);
  const nonceBytes = new Uint8Array(await crypto.subtle.sign("HMAC", cekPrk, nonceInfo)).slice(0, 12);

  const contentEncryptionKey = await crypto.subtle.importKey(
    "raw",
    cekBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  return { contentEncryptionKey, nonce: nonceBytes };
}

async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{ ciphertext: Uint8Array; serverPublicKeyBytes: Uint8Array; salt: Uint8Array }> {
  const clientPublicKey = base64UrlDecode(subscriptionKeys.p256dh);
  const authSecret = base64UrlDecode(subscriptionKeys.auth);

  // Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const serverPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverKeyPair.privateKey,
    256
  );

  const { contentEncryptionKey, nonce } = await deriveKey(
    sharedSecret,
    authSecret,
    clientPublicKey,
    serverPublicKeyBytes
  );

  // Encrypt with padding
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = concatBuffers(payloadBytes, new Uint8Array([2])); // delimiter

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      contentEncryptionKey,
      paddedPayload
    )
  );

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  const header = concatBuffers(
    salt,
    rs,
    new Uint8Array([serverPublicKeyBytes.length]),
    serverPublicKeyBytes
  );

  return {
    ciphertext: concatBuffers(header, encrypted),
    serverPublicKeyBytes,
    salt,
  };
}

async function createVapidJWT(
  endpoint: string,
  vapidPrivateKeyB64: string,
  vapidPublicKeyB64: string
) {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "mailto:noreply@easyflow.app",
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import VAPID private key
  const publicKeyBytes = base64UrlDecode(vapidPublicKeyB64);
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
      y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
      d: vapidPrivateKeyB64,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Ensure raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    const r_len = sigBytes[3];
    const r = sigBytes.slice(4, 4 + r_len);
    const s_offset = 4 + r_len + 2;
    const s = sigBytes.slice(s_offset);
    rawSig = new Uint8Array(64);
    rawSig.set(
      r.length > 32 ? r.slice(r.length - 32) : r,
      32 - Math.min(r.length, 32)
    );
    rawSig.set(
      s.length > 32 ? s.slice(s.length - 32) : s,
      64 - Math.min(s.length, 32)
    );
  }

  return `${unsignedToken}.${base64UrlEncode(rawSig)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKeyB64 =
      "BGWS6V440AeIBkbjXbn1-LR9Qkag0ryitireNChNTKbxEou3qVxMGYfLrmkKM3oVuuxisVVC9WTZD4Xer2nrJSY";
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPrivateKeyB64) {
      return new Response(
        JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
      .not("reminder_time", "is", null);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return new Response(JSON.stringify({ error: tasksError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter tasks whose reminder_time matches current UTC time
    const matchingTasks = (dueTasks || []).filter(
      (t) => t.reminder_time === currentTime
    );

    console.log(
      `Found ${matchingTasks.length} tasks due at ${currentTime} (of ${dueTasks?.length || 0} total with reminders)`
    );

    if (matchingTasks.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No reminders due",
          time: currentTime,
          totalWithReminders: dueTasks?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let errors = 0;

    for (const task of matchingTasks) {
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
          const { ciphertext } = await encryptPayload(payload, {
            p256dh: sub.p256dh,
            auth: sub.auth,
          });

          const jwt = await createVapidJWT(
            sub.endpoint,
            vapidPrivateKeyB64,
            vapidPublicKeyB64
          );

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              Authorization: `vapid t=${jwt}, k=${vapidPublicKeyB64}`,
              TTL: "86400",
              Urgency: "high",
            },
            body: ciphertext,
          });

          console.log(
            `Push to ${sub.endpoint.slice(0, 60)}... status: ${res.status}`
          );

          if (res.ok || res.status === 201) {
            sent++;
          } else if (res.status === 410 || res.status === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log("Removed expired subscription");
          } else {
            const body = await res.text();
            console.error(`Push failed ${res.status}: ${body}`);
            errors++;
          }
        } catch (err) {
          console.error("Push send error:", err);
          errors++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sent} notifications (${errors} errors)`,
        time: currentTime,
        tasksMatched: matchingTasks.length,
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
