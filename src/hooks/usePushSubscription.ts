import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const VAPID_PUBLIC_KEY = 'BGDTko-k3Y8yilEDC6iEmfmE0Zcn-U59j2hTdZK2k8-sUwAVb0HzPjCH1AR73_Siq92QWsDseGef0_eQwzl0-UQ';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return undefined;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return undefined;

    // Don't register in iframes or preview hosts
    const isInIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    const isPreviewHost =
      window.location.hostname.includes('id-preview--') ||
      window.location.hostname.includes('lovableproject.com');
    if (isPreviewHost || isInIframe) return undefined;

    let cancelled = false;

    const subscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }
        if (cancelled) return;

        const subJson = subscription.toJSON();
        if (!subJson.endpoint || !subJson.keys) return;

        await supabase.from('push_subscriptions' as any).upsert(
          {
            user_id: user.id,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          { onConflict: 'user_id,endpoint' }
        );
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    };

    subscribe();

    return () => {
      cancelled = true;
    };
  }, [user]);
}
