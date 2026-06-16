import { describe, expect, test } from "vitest";

import { rankRoutesByRisk } from "@/lib/risk/routeRanking";
import type { RouteResult, TrafficEvent } from "@/lib/types";

const route = (id: string, lngOffset = 0): RouteResult => ({
  id,
  mode: "DRIVE",
  status: "RECOMMENDED",
  name: id,
  distanceMeters: 1200,
  durationSeconds: 600,
  safetyScore: 90,
  riskReasons: [],
  shelterId: "s-01",
  geometry: [
    { lat: 37.4979, lng: 127.0276 + lngOffset },
    { lat: 37.502, lng: 127.035 + lngOffset },
  ],
});

const trafficEvent = (message: string, overrides: Partial<TrafficEvent> = {}): TrafficEvent => ({
  id: "event-1",
  type: "국도",
  eventType: "재난",
  eventDetailType: "도로침수",
  position: { lat: 37.4998, lng: 127.031 },
  roadName: "테헤란로",
  lanesBlockType: "전면통제",
  lanesBlocked: "전차로 차단",
  message,
  source: "ITS eventInfo",
  ...overrides,
});

describe("rankRoutesByRisk traffic events", () => {
  test("rejects a route that passes a flood or control event", () => {
    const [ranked] = rankRoutesByRisk([route("r-1")], [], [trafficEvent("도로 침수로 통제")]);

    expect(ranked.status).toBe("REJECTED");
    expect(ranked.safetyScore).toBe(45);
    expect(ranked.riskReasons[0]).toContain("테헤란로");
  });

  test("keeps distant traffic events from rejecting the route", () => {
    const [ranked] = rankRoutesByRisk([route("r-1", 0.05)], [], [trafficEvent("도로 침수로 통제")]);

    expect(ranked.status).toBe("RECOMMENDED");
    expect(ranked.safetyScore).toBe(90);
  });

  test("penalizes a nearby non-blocking accident without rejecting the route", () => {
    const [ranked] = rankRoutesByRisk(
      [route("r-1")],
      [],
      [
        trafficEvent("추돌사고 처리 중", {
          eventType: "교통사고",
          eventDetailType: "추돌사고",
          lanesBlockType: undefined,
          lanesBlocked: undefined,
        }),
      ],
    );

    expect(ranked.status).toBe("RECOMMENDED");
    expect(ranked.safetyScore).toBe(72);
    expect(ranked.riskReasons[0]).toContain("추돌사고");
  });
});

describe("rankRoutesByRisk removed elevation profiles", () => {
  test("ignores stale elevation metadata when ranking routes", () => {
    const shortRoute = {
      ...route("low-route"),
      distanceMeters: 900,
      safetyScore: 90,
      elevationProfile: {
        minElevationMeters: 4,
        meanElevationMeters: 7,
        lowElevationShare: 0.7,
      },
    } as RouteResult & { elevationProfile: unknown };
    const longRoute = {
      ...route("high-route"),
      distanceMeters: 1100,
      safetyScore: 88,
      elevationProfile: {
        minElevationMeters: 28,
        meanElevationMeters: 35,
        lowElevationShare: 0,
      },
    } as RouteResult & { elevationProfile: unknown };

    const ranked = rankRoutesByRisk([shortRoute, longRoute], []);

    expect(ranked[0].id).toBe("low-route");
    expect(ranked[0].status).toBe("RECOMMENDED");
    expect(ranked.flatMap((route) => route.riskReasons)).not.toContain("상대적으로 높은 지대 경로");
    expect(ranked.flatMap((route) => route.riskReasons)).not.toContain("저지대 구간 포함");
  });
});
