import { handleCorsPreflight, jsonOk } from "../_shared/cors.ts";
import {
  assertAllowedMethod,
  parseJsonBody,
  validateLatLngRequest,
} from "../_shared/validation.ts";
import { edgeError, fetchJson, requireEnv } from "../_shared/upstream.ts";

const collectCoordinates = (coordinates: unknown): Array<{ lat: number; lng: number }> => {
  if (!Array.isArray(coordinates)) return [];
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    return [{ lng: coordinates[0], lat: coordinates[1] }];
  }
  return coordinates.flatMap(collectCoordinates);
};

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  try {
    assertAllowedMethod(request.method, ["POST"]);
    const { origin, destination } = validateLatLngRequest(await parseJsonBody(request));
    const appKey = requireEnv("TMAP_APP_KEY");

    const url = new URL("https://apis.openapi.sk.com/tmap/routes/pedestrian");
    url.searchParams.set("version", "1");
    url.searchParams.set("format", "json");

    const upstream = (await fetchJson(url, {
      method: "POST",
      headers: {
        appKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startX: origin.lng,
        startY: origin.lat,
        endX: destination.lng,
        endY: destination.lat,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: "origin",
        endName: "shelter",
      }),
    })) as {
      features?: Array<{
        type?: string;
        geometry?: { coordinates?: unknown };
        properties?: { totalDistance?: number; totalTime?: number };
      }>;
    };

    const features = upstream.features ?? [];
    const summary = features.find((feature) => feature.properties?.totalDistance)?.properties;
    const geometry = features.flatMap((feature) =>
      collectCoordinates(feature.geometry?.coordinates),
    );
    if (geometry.length === 0) throw new Error("TMAP pedestrian returned no route");

    return jsonOk({
      routes: [
        {
          id: "tmap-walk-recommended",
          mode: "WALK",
          status: "RECOMMENDED",
          name: "TMAP 보행 경로",
          distanceMeters: summary?.totalDistance ?? 0,
          durationSeconds: summary?.totalTime ?? 0,
          safetyScore: 100,
          riskReasons: [],
          geometry,
          shelterId: "external",
        },
      ],
    });
  } catch (error) {
    return edgeError(error);
  }
});
