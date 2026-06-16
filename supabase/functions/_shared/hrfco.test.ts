import { describe, expect, test } from "vitest";

import {
  buildFloodForecastSensorFeeds,
  buildRainfallSensorFeed,
  buildWaterlevelSensorFeed,
  hrfcoDmsToDecimal,
  mapHrfcoWaterRiskLevel,
  selectNearestHrfcoStation,
} from "./hrfco";

describe("HRFCO shared helpers", () => {
  test("converts HRFCO DMS coordinates to decimal degrees", () => {
    expect(hrfcoDmsToDecimal("127-01-30")).toBeCloseTo(127.025, 6);
    expect(hrfcoDmsToDecimal("37-30-00 ")).toBeCloseTo(37.5, 6);
    expect(hrfcoDmsToDecimal("")).toBeNull();
  });

  test("selects the nearest station using WGS84 coordinates", () => {
    const station = selectNearestHrfcoStation({ lat: 37.5, lng: 127.0 }, [
      {
        wlobscd: "far",
        obsnm: "Far Station",
        lat: "35-00-00",
        lon: "129-00-00",
      },
      {
        wlobscd: "near",
        obsnm: "Near Station",
        lat: "37-30-05",
        lon: "127-00-05",
      },
    ]);

    expect(station?.wlobscd).toBe("near");
  });

  test("maps water level thresholds to warning levels", () => {
    const thresholds = {
      attentionLevel: 2,
      warningLevel: 3,
      alarmLevel: 4,
      seriousLevel: 5,
    };

    expect(mapHrfcoWaterRiskLevel(1.9, thresholds)).toBe("SAFE");
    expect(mapHrfcoWaterRiskLevel(2, thresholds)).toBe("WATCH");
    expect(mapHrfcoWaterRiskLevel(3, thresholds)).toBe("WARNING");
    expect(mapHrfcoWaterRiskLevel(4, thresholds)).toBe("CRITICAL");
    expect(mapHrfcoWaterRiskLevel(5, thresholds)).toBe("CRITICAL");
  });

  test("builds a water level sensor feed from station metadata and latest reading", () => {
    const feed = buildWaterlevelSensorFeed(
      {
        wlobscd: "1018683",
        obsnm: "서울시(한강대교)",
        agcnm: "기후에너지환경부",
        addr: "서울특별시",
        etcaddr: "한강대교",
        lon: "126-57-18",
        lat: "37-31-05",
        attwl: "3.9",
        wrnwl: "4.5",
        almwl: "5.5",
        srswl: "6.0",
        pfh: "7.0",
      },
      {
        wlobscd: "1018683",
        ymdhm: "202606140120",
        wl: "6.1",
        fw: "1126.88",
      },
    );

    expect(feed).toMatchObject({
      id: "hrfco-waterlevel-1018683",
      type: "WATER_LEVEL",
      status: "ACTIVE",
      currentLevel: 6.1,
      seriousLevel: 6,
      riskLevel: "CRITICAL",
      lastObservedAt: "2026-06-14T01:20:00+09:00",
    });
  });

  test("builds an hourly rainfall sensor feed for early warning", () => {
    const feed = buildRainfallSensorFeed(
      {
        rfobscd: "10184100",
        obsnm: "서울시(대곡교)",
        agcnm: "기후에너지환경부",
        addr: "서울특별시",
        etcaddr: "대곡교",
        lon: "127-05-00",
        lat: "37-29-00",
      },
      {
        rfobscd: "10184100",
        ymdhm: "2026061401",
        rf: "32.5",
      },
      "1H",
    );

    expect(feed).toMatchObject({
      id: "hrfco-rainfall-10184100",
      type: "RAINFALL",
      currentRainfallMmPerHour: 32.5,
      riskLevel: "WARNING",
      lastObservedAt: "2026-06-14T01:00:00+09:00",
    });
  });

  test("normalizes flood forecast records into official alert feeds", () => {
    const feeds = buildFloodForecastSensorFeeds([
      {
        ancdt: "202606140130",
        kind: "홍수경보",
        obsnm: "서울시(한강대교)",
        rvrnm: "한강",
        sttnm: "1018683",
        wrnaranm: "서울특별시",
      },
    ]);

    expect(feeds[0]).toMatchObject({
      id: "hrfco-fldfct-1018683-202606140130",
      type: "FLOOD_FORECAST",
      status: "ACTIVE",
      riskLevel: "CRITICAL",
      forecastKind: "홍수경보",
    });
  });
});
