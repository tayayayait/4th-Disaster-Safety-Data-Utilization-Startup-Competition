import { z } from "zod";
import { describe, expect, test, vi } from "vitest";

import { requestApiResult } from "./client";
import { createApiCache } from "./cache";

const Schema = z.object({ value: z.string() });

describe("requestApiResult", () => {
  test("returns OK and caches parsed API data", async () => {
    let now = 1_000;
    const cache = createApiCache(() => now);
    const fetcher = vi.fn().mockResolvedValue({ value: "live" });

    const first = await requestApiResult({
      key: "live-key",
      source: "unit-api",
      schema: Schema,
      fetcher,
      cache,
      ttlMs: 500,
      now: () => now,
    });
    now = 1_100;
    const second = await requestApiResult({
      key: "live-key",
      source: "unit-api",
      schema: Schema,
      fetcher,
      cache,
      ttlMs: 500,
      now: () => now,
    });

    expect(first).toMatchObject({ data: { value: "live" }, status: "OK", source: "unit-api" });
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("returns STALE cached data when refresh fails after TTL", async () => {
    let now = 1_000;
    const cache = createApiCache(() => now);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ value: "cached" })
      .mockRejectedValueOnce(new Error("timeout"));

    await requestApiResult({
      key: "route-key",
      source: "route-api",
      schema: Schema,
      fetcher,
      cache,
      ttlMs: 100,
      now: () => now,
    });

    now = 1_101;
    const stale = await requestApiResult({
      key: "route-key",
      source: "route-api",
      schema: Schema,
      fetcher,
      cache,
      ttlMs: 100,
      now: () => now,
    });

    expect(stale).toMatchObject({
      data: { value: "cached" },
      status: "STALE",
      source: "route-api",
      error: "timeout",
    });
  });

  test("returns fallback data when parsing fails and no stale cache exists", async () => {
    const fallback = await requestApiResult({
      key: "bad-key",
      source: "weather-api",
      schema: Schema,
      fetcher: vi.fn().mockResolvedValue({ value: 123 }),
      fallback: { value: "demo" },
      ttlMs: 100,
      now: () => 1_000,
    });

    expect(fallback).toMatchObject({
      data: { value: "demo" },
      status: "FALLBACK",
      source: "weather-api",
    });
    expect(fallback.error).toContain("Expected string");
  });
});
