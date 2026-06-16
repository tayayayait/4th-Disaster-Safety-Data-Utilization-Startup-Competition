require("dotenv").config({ path: ".env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// For Edge Function testing, we can hit the local edge function
const functionUrl = `${supabaseUrl}/functions/v1/cctv-info`;

async function syncAllCctvs() {
  console.log("Starting Nationwide CCTV Sync (Read-Through Cache Trigger)...");

  // Korea bounding box roughly:
  // minX: 125, maxX: 130
  // minY: 33, maxY: 39
  // We divide this into 0.5 degree grids to avoid API limits

  for (let lat = 33; lat <= 38.5; lat += 0.5) {
    for (let lng = 125; lng <= 129.5; lng += 0.5) {
      const bounds = {
        minX: lng,
        maxX: lng + 0.5,
        minY: lat,
        maxY: lat + 0.5,
      };

      const center = {
        lat: lat + 0.25,
        lng: lng + 0.25,
      };

      console.log(`Fetching grid [${lng}, ${lat}]...`);
      try {
        const res = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            center,
            bounds,
            radiusMeters: 50000, // Dummy
            limit: 5000,
          }),
        });

        const data = await res.json();
        const count = data.cameras?.length || 0;
        console.log(`-> Received ${count} cameras. Source: ${data.source}`);

        // Sleep to avoid rate limit
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error("Error fetching grid:", err);
      }
    }
  }

  console.log("Sync complete!");
}

syncAllCctvs();
