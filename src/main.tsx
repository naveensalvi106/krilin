import { createRoot } from "react-dom/client";
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { supabase } from "@/integrations/supabase/client";
import App from "./App.tsx";
import "./index.css";

// Configure status bar for Android
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});
  document.body.classList.add('capacitor-android');
}

// Handle Deep Links for Google Login
CapApp.addListener('appUrlOpen', async (data) => {
  const url = new URL(data.url);
  
  // Supabase stores tokens in the URL fragment (#)
  const hash = url.hash;
  if (hash && hash.includes('access_token=')) {
    try {
      // Remove the '#' to parse fragment as search params
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        console.log('Login successful via deep link');
        window.location.href = '/'; // Go to dashboard
      }
    } catch (e) {
      console.error('Failed to handle deep link login:', e);
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);

// Guard: don't register SW in iframes or preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}
