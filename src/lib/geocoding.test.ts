import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DEMO_CENTER } from "@/mocks/data";
import { geocodeAddress, validateAddressQuery } from "./geocoding";

vi.mock("@/lib/map/naverMaps", () => ({
  loadNaverMapsSDK: vi.fn(() => Promise.reject(new Error("Naver Maps SDK unavailable"))),
}));

describe("validateAddressQuery", () => {
  test("accepts a trimmed query with at least two characters", () => {
    expect(validateAddressQuery("  강남역  ")).toEqual({
      ok: true,
      value: "강남역",
    });
  });

  test("rejects blank or one-character queries", () => {
    expect(validateAddressQuery("")).toEqual({
      ok: false,
      error: "주소 또는 장소명을 2글자 이상 입력하세요.",
    });
    expect(validateAddressQuery("역")).toEqual({
      ok: false,
      error: "주소 또는 장소명을 2글자 이상 입력하세요.",
    });
  });
});

describe("geocodeAddress", () => {
  beforeEach(() => {
    window.naver = undefined;
  });

  afterEach(() => {
    window.naver = undefined;
  });

  test("returns a demo fallback when the Naver geocoder is unavailable", async () => {
    await expect(geocodeAddress("강남역")).resolves.toEqual([
      {
        id: "fallback-demo-center",
        label: "강남역",
        address: "확실한 정보 없음",
        position: DEMO_CENTER,
        source: "FALLBACK",
      },
    ]);
  });
});
