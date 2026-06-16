import type { RiskLevel } from "@/lib/types";

export interface SafeMapFeatureInfoResult {
  overlap: number;
  features: unknown[];
}

export interface SafeMapEvidenceInput {
  floodTrace: SafeMapFeatureInfoResult;
  riverFlood: SafeMapFeatureInfoResult;
}

export interface SafeMapRiskEvidence {
  id: "safemap-flood-trace" | "safemap-river-flood";
  label: string;
  severity: Extract<RiskLevel, "WATCH" | "WARNING" | "CRITICAL">;
  summary: string;
  detail: string;
  source: string;
  featureCount: number;
}

const hasOverlap = (result: SafeMapFeatureInfoResult) =>
  result.overlap > 0 || result.features.length > 0;

export const buildSafeMapEvidence = ({
  floodTrace,
  riverFlood,
}: SafeMapEvidenceInput): SafeMapRiskEvidence[] => {
  const evidence: SafeMapRiskEvidence[] = [];

  if (hasOverlap(floodTrace)) {
    evidence.push({
      id: "safemap-flood-trace",
      label: "침수흔적도",
      severity: "WARNING",
      summary: "현재 위치가 과거 침수 이력 구역과 겹칩니다.",
      detail: "SafeMap 침수흔적도 기준으로 침수흔적 영역이 확인됐습니다.",
      source: "SafeMap IF_0092_WMS",
      featureCount: floodTrace.features.length,
    });
  }

  if (hasOverlap(riverFlood)) {
    evidence.push({
      id: "safemap-river-flood",
      label: "하천범람지도",
      severity: "WARNING",
      summary: "현재 위치가 하천범람 예상지역과 겹칩니다.",
      detail: "SafeMap 하천범람지도 기준으로 100년 빈도 침수 예상지역이 확인됐습니다.",
      source: "SafeMap IF_0089_WMS",
      featureCount: riverFlood.features.length,
    });
  }

  return evidence;
};
