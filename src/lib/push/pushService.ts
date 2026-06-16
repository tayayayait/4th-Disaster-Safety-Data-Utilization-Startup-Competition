import { supabase } from "@/integrations/supabase/client";

// VAPID public key should be provided via environment variables in a real implementation
const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const initPushNotifications = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications are not supported by this browser");
    return;
  }

  let permStatus = Notification.permission;

  if (permStatus === "default") {
    permStatus = await Notification.requestPermission();
  }

  if (permStatus !== "granted") {
    throw new Error("User denied push notifications");
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    console.log("Web Push registration success");
    await (supabase.from as any)("device_tokens").upsert({
      token: JSON.stringify(subscription),
      platform: "web",
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error on Web Push registration: ", error);
  }
};
