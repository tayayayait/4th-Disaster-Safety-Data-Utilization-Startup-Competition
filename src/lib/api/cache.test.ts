import { describe, expect, test } from "vitest";

import { API_CACHE_TTL_MS, buildRouteCacheKey, createApiCache } from "./cache";
import type { ApiResult } from "./types";

const result: ApiResult<{ value: string }> = {
  data: { value: "ok" },
  status: "OK",
  timestamp: "2026-06-11T08:00:00.000Z",
  source: "test",
};

describe("api cache", () => {
  test("returns fresh values until the TTL expires", () => {
    let now = 1_000;
    const cache = createApiCache(() => now);

    cache.set("k", result, 500);

    expect(cache.getFresh("k")).toEqual(result);
    now = 1_501;
    expect(cache.getFresh("k")).toBeNull();
    expect(cache.getStale("k")).toEqual(result);
  });

  test("uses documented TTL values", () => {
    expect(API_CACHE_TTL_MS.SHELTERS).toBe(24 * 60 * 60 * 1000);
    expect(API_CACHE_TTL_MS.WMS_METADATA).toBe(6 * 60 * 60 * 1000);
    expect(API_CACHE_TTL_MS.WEATHER_CURRENT).toBe(10 * 60 * 1000);
    expect(API_CACHE_TTL_MS.WEATHER_ALERT).toBe(30 * 60 * 1000);
    expect(API_CACHE_TTL_MS.ROUTE).toBe(5 * 60 * 1000);
    expect(API_CACHE_TTL_MS.GEMINI).toBe(30 * 60 * 1000);
  });

  test("builds route keys from coordinates, mode, destination, and source version", () => {
    expect(
      buildRouteCacheKey({
        origin: { lat: 37.4979123, lng: 127.0276234 },
        destination: { lat: 37.5023444, lng: 127.0301555 },
        mode: "WALK",
        sourceVersion: "mock-2026-06-11",
      }),
    ).toBe("route:WALK:37.49791,127.02762:37.50234,127.03016:mock-2026-06-11");
  });
});
