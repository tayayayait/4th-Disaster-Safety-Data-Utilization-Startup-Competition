import { describe, expect, test } from "vitest";
import { calculateRiskScore } from "./calculateRiskScore";

describe("calculateRiskScore", () => {
  const baseInput = {
    weather: { rainfallMmPerHour: 0 },
    forecast: { rainfallMmPerHour: 0 },
    floodTrace: false,
    floodTraceOverlap: 0,
    riverFlood: false,
    riverFloodOverlap: 0,
    disasterMessages: [],
    hasUnderpass: false,
    trafficControl: false,
    failedDataCount: 0,
  };

  test("calculates weather score correctly based on limits", () => {
    // 0mm = 0 score
    expect(
      calculateRiskScore({
        ...baseInput,
        weather: { rainfallMmPerHour: 0 },
      }).weather,
    ).toBe(0);

    // 15mm = Math.round(30 * (15 / 30)) = 15 score
    expect(
      calculateRiskScore({
        ...baseInput,
        weather: { rainfallMmPerHour: 15 },
      }).weather,
    ).toBe(15);

    // 30mm = 30 score
    expect(
      calculateRiskScore({
        ...baseInput,
        weather: { rainfallMmPerHour: 30 },
      }).weather,
    ).toBe(30);

    // 50mm = 30 score (capped)
    expect(
      calculateRiskScore({
        ...baseInput,
        weather: { rainfallMmPerHour: 50 },
      }).weather,
    ).toBe(30);
  });

  test("calculates floodTrace score using overlap ratio", () => {
    // 0% overlap = 0 score
    expect(calculateRiskScore({ ...baseInput, floodTraceOverlap: 0 }).floodTrace).toBe(0);

    // 50% overlap = Math.round(25 * 0.5) = 13
    expect(calculateRiskScore({ ...baseInput, floodTraceOverlap: 0.5 }).floodTrace).toBe(13);

    // 100% overlap = 25
    expect(calculateRiskScore({ ...baseInput, floodTraceOverlap: 1 }).floodTrace).toBe(25);
  });

  test("returns UNKNOWN level if 2 or more data sources failed", () => {
    const result = calculateRiskScore({
      ...baseInput,
      failedDataCount: 2,
    });
    expect(result.level).toBe("UNKNOWN");
    expect(result.total).toBe(-1);
  });

  test("raises risk to CRITICAL when HRFCO water level reaches serious threshold", () => {
    const result = calculateRiskScore({
      ...baseInput,
      sensors: [
        {
          id: "hrfco-waterlevel-1018683",
          status: "ACTIVE",
          type: "WATER_LEVEL",
          currentLevel: 6.1,
          attentionLevel: 3.9,
          warningLevel: 4.5,
          alarmLevel: 5.5,
          seriousLevel: 6,
          riskLevel: "CRITICAL",
        },
      ],
    });

    expect(result.riverFlood).toBe(80);
    expect(result.level).toBe("CRITICAL");
    expect(result.reasons).toContain("실시간 수위·홍수예보 위험");
  });

  test("uses HRFCO hourly rainfall as early warning weather input", () => {
    const result = calculateRiskScore({
      ...baseInput,
      sensors: [
        {
          id: "hrfco-rainfall-10184100",
          status: "ACTIVE",
          type: "RAINFALL",
          currentRainfallMmPerHour: 32,
          riskLevel: "WARNING",
        },
      ],
    });

    expect(result.weather).toBe(30);
    expect(result.level).toBe("WATCH");
  });

  test("uses active HRFCO sensor data instead of UNKNOWN when weather data is missing", () => {
    const result = calculateRiskScore({
      ...baseInput,
      weather: null,
      forecast: null,
      sensors: [
        {
          id: "hrfco-waterlevel-1018683",
          status: "ACTIVE",
          type: "WATER_LEVEL",
          currentLevel: 6.1,
          seriousLevel: 6,
          riskLevel: "CRITICAL",
        },
      ],
    });

    expect(result.total).toBe(80);
    expect(result.level).toBe("CRITICAL");
  });
});
