import { Link } from "@tanstack/react-router";
import { Footprints, Car } from "lucide-react";
import { RISK_META, riskClass } from "@/lib/risk";
import type { AiAnswer, RiskLevel, Shelter } from "@/lib/types";
import { formatDistance, formatTimestamp } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type ApiStatus = "OK" | "STALE" | "FAILED" | "FALLBACK";

const API_STATUS_LABEL: Record<ApiStatus, string> = {
  OK: "정상",
  STALE: "지연 데이터",
  FAILED: "연동 실패",
  FALLBACK: "대체 데이터",
};

export function ActionCard({
  level,
  shelter,
  distanceMeters,
  timestamp,
  apiStatus = "FALLBACK",
  aiAdvice,
  isAiLoading,
  shelterLabel = "추천 대피소",
}: {
  level: RiskLevel;
  shelter?: Shelter;
  distanceMeters?: number;
  timestamp: string;
  apiStatus?: ApiStatus;
  aiAdvice?: AiAnswer;
  isAiLoading?: boolean;
  shelterLabel?: string;
}) {
  const meta = RISK_META[level];
  const c = riskClass(level);
  const isCritical = level === "CRITICAL";

  return (
    <section
      aria-label="추천 행동"
      className="bg-white"
      style={{
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -8px 24px rgba(15,23,42,0.12)",
        padding: 20,
      }}
    >
      <div
        className="inline-block mb-2"
        style={{
          background: c.bg,
          color: c.text,
          fontSize: 12,
          fontWeight: 800,
          padding: "4px 8px",
          borderRadius: 6,
        }}
      >
        {meta.label} · 추천 행동
      </div>
      <h2
        style={{
          fontSize: isCritical ? 22 : 18,
          fontWeight: 800,
          lineHeight: 1.35,
          color: "var(--text)",
        }}
      >
        {isAiLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin text-[var(--primary)]" size={20} />
            <span className="text-[16px] text-[var(--text-muted)] font-normal">
              AI가 맞춤형 안내를 생성하고 있습니다...
            </span>
          </div>
        ) : aiAdvice && aiAdvice.verified !== false ? (
          aiAdvice.judgementLabel
        ) : (
          meta.actionTitle
        )}
      </h2>
      {!isAiLoading ? (
        <div
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {aiAdvice && aiAdvice.verified === false ? (
            <div className="mb-3 text-[13px] text-red-500 bg-red-50 p-2 rounded flex gap-1.5 items-start">
              <span>⚠️</span>
              <span>
                AI 서버 통신 지연으로 맞춤형 안내를 제공할 수 없습니다. (기본 안내로 대체됩니다)
              </span>
            </div>
          ) : null}
          {aiAdvice && aiAdvice.verified !== false ? (
            <ul className="space-y-1 list-disc list-inside">
              {aiAdvice.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          ) : (
            meta.actionBody
          )}
        </div>
      ) : null}

      {shelter ? (
        <div className="mt-3 pt-3 border-t border-[var(--border-soft)]" style={{ fontSize: 13 }}>
          <div className="text-[var(--text-subtle)]">{shelterLabel}</div>
          <div className="font-bold mt-0.5">{shelter.name}</div>
          {distanceMeters != null ? (
            <div className="text-[var(--text-muted)] tnum mt-0.5">
              약 {formatDistance(distanceMeters)} · 도보 권장
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Link
          to="/routes"
          search={{ mode: "WALK" }}
          className="flex items-center justify-center gap-2 rounded-[10px] font-bold"
          style={{
            background: "var(--primary)",
            color: "white",
            height: 52,
            fontSize: 15,
          }}
        >
          <Footprints size={18} /> {meta.ctaLabel}
        </Link>
        <Link
          to="/routes"
          search={{ mode: "DRIVE" }}
          className="flex items-center justify-center gap-2 rounded-[10px] font-bold border border-[var(--border)]"
          style={{
            background: "white",
            color: "var(--text)",
            height: 52,
            fontSize: 15,
          }}
        >
          <Car size={18} /> 차량 경로
        </Link>
      </div>

      <div className="mt-3 text-[var(--text-subtle)] tnum" style={{ fontSize: 12 }}>
        데이터 기준 {formatTimestamp(timestamp)}
        <span className="mx-1" aria-hidden>
          ·
        </span>
        데이터 상태 {API_STATUS_LABEL[apiStatus]}
      </div>
    </section>
  );
}
