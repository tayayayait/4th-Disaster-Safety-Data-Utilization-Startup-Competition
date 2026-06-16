import { supabase } from "@/integrations/supabase/client";

export const initBackgroundLocation = async () => {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation is not supported by this browser");
  }

  // Request Permissions for Geolocation (in browser it's prompted when we call watchPosition)
  return new Promise<number>((resolve, reject) => {
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        // Send location to Edge Function to check if inside risk zone and send push if needed
        await supabase.functions.invoke("location-check", {
          body: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: position.timestamp,
          },
        });
        resolve(watchId);
      },
      (err) => {
        console.error("Background location error:", err);
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
};
