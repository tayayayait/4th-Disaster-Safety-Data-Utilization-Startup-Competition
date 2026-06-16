import { describe, expect, test } from "vitest";

import {
  getNationwideCctvDescription,
  NATIONAL_CCTV_BOUNDS,
  NATIONAL_CCTV_CENTER,
} from "./FieldCctv";

describe("nationwide CCTV coverage", () => {
  test("describes CCTV coverage without a user-selected lookup location", () => {
    expect(getNationwideCctvDescription()).toBe("전국 CCTV 위치 기준 · 사용자 선택 위치 미사용");
  });

  test("uses a fixed national map center derived from the national bounds", () => {
    expect(NATIONAL_CCTV_CENTER).toEqual({
      lat: (NATIONAL_CCTV_BOUNDS.minY + NATIONAL_CCTV_BOUNDS.maxY) / 2,
      lng: (NATIONAL_CCTV_BOUNDS.minX + NATIONAL_CCTV_BOUNDS.maxX) / 2,
    });
  });
});
