import type { RiskLevel } from "./types";

export const RISK_META: Record<
  RiskLevel,
  {
    label: string;
    short: string;
    actionTitle: string;
    actionBody: string;
    ctaLabel: string;
  }
> = {
  SAFE: {
    label: "안전",
    short: "SAFE",
    actionTitle: "현재 위치는 즉시 대피 대상이 아닙니다",
    actionBody: "강우와 침수 이력 기준 위험이 낮습니다.",
    ctaLabel: "경로 미리 보기",
  },
  WATCH: {
    label: "주의",
    short: "WATCH",
    actionTitle: "이동 전 경로를 확인하세요",
    actionBody: "일부 저지대 또는 침수 이력 구간이 있습니다.",
    ctaLabel: "안전경로 확인",
  },
  WARNING: {
    label: "경계",
    short: "WARNING",
    actionTitle: "안전한 대피소 이동을 준비하세요",
    actionBody: "추천 경로 외 구간은 침수 위험이 있습니다.",
    ctaLabel: "경로 위험 확인",
  },
  CRITICAL: {
    label: "심각",
    short: "CRITICAL",
    actionTitle: "즉시 안전한 곳으로 이동하세요",
    actionBody: "현재 위치 주변에 침수 또는 통제 위험이 매우 높습니다.",
    ctaLabel: "가장 안전한 경로 시작",
  },
  UNKNOWN: {
    label: "정보없음",
    short: "UNKNOWN",
    actionTitle: "일부 데이터를 확인할 수 없습니다",
    actionBody: "현재 결과는 사용 가능한 데이터만으로 계산되었습니다.",
    ctaLabel: "경로 확인",
  },
};

export function scoreToLevel(score: number): RiskLevel {
  if (!Number.isFinite(score) || score < 0) return "UNKNOWN";
  if (score <= 24) return "SAFE";
  if (score <= 49) return "WATCH";
  if (score <= 74) return "WARNING";
  return "CRITICAL";
}

export function riskClass(level: RiskLevel) {
  return {
    SAFE: {
      bg: "var(--risk-safe-bg)",
      text: "var(--risk-safe-text)",
      overlay: "var(--risk-safe-overlay)",
    },
    WATCH: {
      bg: "var(--risk-watch-bg)",
      text: "var(--risk-watch-text)",
      overlay: "var(--risk-watch-overlay)",
    },
    WARNING: {
      bg: "var(--risk-warning-bg)",
      text: "var(--risk-warning-text)",
      overlay: "var(--risk-warning-overlay)",
    },
    CRITICAL: {
      bg: "var(--risk-critical-bg)",
      text: "var(--risk-critical-text)",
      overlay: "var(--risk-critical-overlay)",
    },
    UNKNOWN: {
      bg: "var(--risk-unknown-bg)",
      text: "var(--risk-unknown-text)",
      overlay: "var(--risk-unknown-overlay)",
    },
  }[level];
}
