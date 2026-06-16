import { describe, expect, test } from "vitest";

import { buildSafeMapEvidence } from "./safemapEvidence";

describe("buildSafeMapEvidence", () => {
  test("builds evidence for flood trace and river flood overlaps", () => {
    const evidence = buildSafeMapEvidence({
      floodTrace: {
        overlap: 1,
        features: [{ properties: { fld_ar: "테스트 침수구역" } }],
      },
      riverFlood: {
        overlap: 1,
        features: [{ id: "river-zone" }],
      },
    });

    expect(evidence).toEqual([
      {
        id: "safemap-flood-trace",
        label: "침수흔적도",
        severity: "WARNING",
        summary: "현재 위치가 과거 침수 이력 구역과 겹칩니다.",
        detail: "SafeMap 침수흔적도 기준으로 침수흔적 영역이 확인됐습니다.",
        source: "SafeMap IF_0092_WMS",
        featureCount: 1,
      },
      {
        id: "safemap-river-flood",
        label: "하천범람지도",
        severity: "WARNING",
        summary: "현재 위치가 하천범람 예상지역과 겹칩니다.",
        detail: "SafeMap 하천범람지도 기준으로 100년 빈도 침수 예상지역이 확인됐습니다.",
        source: "SafeMap IF_0089_WMS",
        featureCount: 1,
      },
    ]);
  });

  test("does not create evidence when there is no layer overlap", () => {
    expect(
      buildSafeMapEvidence({
        floodTrace: { overlap: 0, features: [] },
        riverFlood: { overlap: 0, features: [] },
      }),
    ).toEqual([]);
  });
});
