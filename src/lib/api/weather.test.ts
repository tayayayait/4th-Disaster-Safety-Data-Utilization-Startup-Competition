import { describe, expect, test } from "vitest";

import { buildKmaWeatherRequest, toKmaGrid } from "./weather";

describe("KMA weather request mapping", () => {
  test("converts Seoul coordinates to the official KMA grid cell", () => {
    expect(toKmaGrid({ lat: 37.5665, lng: 126.978 })).toEqual({ nx: 60, ny: 127 });
  });

  test("uses the previous hourly nowcast base time before minute 40", () => {
    expect(
      buildKmaWeatherRequest({
        origin: { lat: 37.5665, lng: 126.978 },
        now: new Date("2026-06-11T00:20:00+09:00"),
      }),
    ).toEqual({
      nx: 60,
      ny: 127,
      baseDate: "20260610",
      baseTime: "2300",
    });
  });
});
