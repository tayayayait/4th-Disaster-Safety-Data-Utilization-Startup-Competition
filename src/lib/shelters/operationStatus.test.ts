import { describe, expect, test } from "vitest";

import {
  deriveFloodShelterStatus,
  displayShelterStatus,
  isFloodUnsafeShelter,
} from "@/lib/shelters/operationStatus";
import type { Shelter } from "@/lib/types";

const baseShelter: Shelter = {
  id: "shelter-1",
  name: "역삼초등학교 체육관",
  address: "서울 강남구 역삼로 153",
  position: { lat: 37.5, lng: 127.03 },
  capacity: 420,
  status: "OPERATING",
  underground: false,
  type: "민방위대피시설",
};

describe("operationStatus", () => {
  test("marks underground shelters as flood unsafe", () => {
    expect(
      isFloodUnsafeShelter({
        ...baseShelter,
        name: "현대빌딩 본관 지하2층",
        underground: true,
      }),
    ).toBe(true);
  });

  test("marks keyword-matched shelters as excluded for flood evacuation", () => {
    const shelter = {
      ...baseShelter,
      name: "강남세브란스병원 지하주차장",
      underground: false,
    };

    expect(isFloodUnsafeShelter(shelter)).toBe(true);
    expect(deriveFloodShelterStatus(shelter)).toBe("EXCLUDED");
  });

  test("keeps ground shelters in their original operation status", () => {
    expect(deriveFloodShelterStatus(baseShelter)).toBe("OPERATING");
  });

  test("shows stale operation status as check required", () => {
    expect(displayShelterStatus("OPERATING", null)).toBe("CHECK_REQUIRED");
  });
});
