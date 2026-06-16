import { describe, expect, test } from "vitest";

import { normalizeKmaWeather, toKmaForecastBase } from "./kma";

describe("KMA Edge weather normalization", () => {
  test("normalizes nowcast and forecast categories into the internal weather model", () => {
    expect(
      normalizeKmaWeather({
        baseDate: "20260611",
        baseTime: "1400",
        nowcastItems: [
          { category: "RN1", obsrValue: "18.5" },
          { category: "PTY", obsrValue: "1" },
          { category: "REH", obsrValue: "91" },
        ],
        forecastItems: [
          { category: "POP", fcstValue: "70" },
          { category: "PCP", fcstValue: "5mm" },
        ],
      }),
    ).toMatchObject({
      observedAt: "20260611T1400",
      rainfallMmPerHour: 18.5,
      humidityPercent: 91,
      precipitationProbabilityPercent: 70,
      precipitationAmount: "5mm",
      precipitationType: "rain",
      alerts: [{ level: "WATCH", title: "강수 관측" }],
    });
  });

  test("uses the latest available KMA village forecast base time", () => {
    expect(toKmaForecastBase("20260611", "1400")).toEqual({
      baseDate: "20260611",
      baseTime: "1100",
    });
    expect(toKmaForecastBase("20260611", "0100")).toEqual({
      baseDate: "20260610",
      baseTime: "2300",
    });
  });
});
