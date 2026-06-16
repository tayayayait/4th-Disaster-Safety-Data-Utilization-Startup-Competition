import { describe, expect, test } from "vitest";

import { parseDisasterMessages, parseMoisDisasterMessage } from "./disasterMsg";
import { parseNaverDirectionsRoutes } from "./naverDirections";
import { fetchNaverDirectionsRoutes } from "./naverDirections";
import { parseTmapPedestrianRoutes } from "./tmapPedestrian";
import { fetchTmapPedestrianRoutes } from "./tmapPedestrian";
import { parseWeatherSnapshot } from "./weather";

describe("API response parsers", () => {
  test("parses canonical NAVER Directions routes", () => {
    const routes = parseNaverDirectionsRoutes({
      routes: [
        {
          id: "naver-drive-1",
          mode: "DRIVE",
          status: "RECOMMENDED",
          name: "차량 우회 경로",
          distanceMeters: 2400,
          durationSeconds: 620,
          safetyScore: 78,
          riskReasons: ["침수흔적 우회"],
          geometry: [
            { lat: 37.4979, lng: 127.0276 },
            { lat: 37.5023, lng: 127.0301 },
          ],
          shelterId: "s-05",
        },
      ],
    });

    expect(routes[0]?.mode).toBe("DRIVE");
    expect(routes[0]?.geometry).toHaveLength(2);
  });

  test("fetches NAVER Directions routes through an Edge fetcher", async () => {
    const request = {
      origin: { lat: 37.4979, lng: 127.0276 },
      destination: { lat: 37.5005, lng: 127.0354 },
    };
    const fetcher = async (body: typeof request) => {
      expect(body).toEqual(request);
      return {
        routes: [
          {
            id: "naver-drive-1",
            mode: "DRIVE",
            status: "RECOMMENDED",
            name: "NAVER 차량 경로",
            distanceMeters: 2400,
            durationSeconds: 620,
            safetyScore: 78,
            riskReasons: [],
            geometry: [request.origin, request.destination],
            shelterId: "external",
          },
        ],
      };
    };

    await expect(fetchNaverDirectionsRoutes(request, fetcher)).resolves.toHaveLength(1);
  });

  test("parses canonical TMAP pedestrian routes", () => {
    const routes = parseTmapPedestrianRoutes({
      routes: [
        {
          id: "tmap-walk-1",
          mode: "WALK",
          status: "ALTERNATIVE",
          name: "도보 경로",
          distanceMeters: 920,
          durationSeconds: 840,
          safetyScore: 86,
          riskReasons: [],
          geometry: [{ lat: 37.4979, lng: 127.0276 }],
          shelterId: "s-01",
        },
      ],
    });

    expect(routes[0]?.mode).toBe("WALK");
  });

  test("fetches TMAP pedestrian routes through an Edge fetcher", async () => {
    const request = {
      origin: { lat: 37.4979, lng: 127.0276 },
      destination: { lat: 37.5005, lng: 127.0354 },
    };
    const fetcher = async () => ({
      routes: [
        {
          id: "tmap-walk-1",
          mode: "WALK",
          status: "RECOMMENDED",
          name: "TMAP 보행 경로",
          distanceMeters: 920,
          durationSeconds: 840,
          safetyScore: 86,
          riskReasons: [],
          geometry: [request.origin, request.destination],
          shelterId: "external",
        },
      ],
    });

    await expect(fetchTmapPedestrianRoutes(request, fetcher)).resolves.toHaveLength(1);
  });

  test("parses weather snapshots and alert messages", () => {
    const weather = parseWeatherSnapshot({
      observedAt: "2026-06-11T14:30:00+09:00",
      rainfallMmPerHour: 18.5,
      waterLevelMeters: 1.2,
      alerts: [
        { id: "a1", level: "WATCH", title: "호우주의보", issuedAt: "2026-06-11T14:00:00+09:00" },
      ],
    });

    expect(weather.alerts[0]?.level).toBe("WATCH");
    expect(weather.rainfallMmPerHour).toBe(18.5);
  });

  test("parses disaster messages", () => {
    const messages = parseDisasterMessages({
      messages: [
        {
          id: "m1",
          region: "서울 강남구",
          body: "하천변 접근 금지",
          issuedAt: "2026-06-11T14:31:00+09:00",
          source: "MOIS",
        },
      ],
    });

    expect(messages[0]?.region).toBe("서울 강남구");
  });

  test("normalizes MOIS emergency disaster message fields", () => {
    const message = parseMoisDisasterMessage({
      SN: 123,
      CRT_DT: "2026-06-12 10:00:00",
      MSG_CN: "강남구 호우로 인한 침수 주의",
      RCPTN_RGN_NM: "서울 강남구",
      EMRG_STEP_NM: "긴급재난",
      DST_SE_NM: "호우",
      REG_YMD: "20260612",
      MDFCN_YMD: "20260612",
    });

    expect(message).toMatchObject({
      id: "123",
      source: "MOIS-DSSP-IF-00247",
      emergencyLevel: "긴급재난",
      disasterType: "호우",
    });
  });
});
