import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertCircle, Database } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiStatusCard } from "@/components/ops/ApiStatusCard";
import { ApiStatusTable } from "@/components/ops/ApiStatusTable";
import { OpsLayout } from "@/components/ops/OpsLayout";
import { useDisasterMessages } from "@/hooks/useDisasterMessages";
import { API_STATUS_META, summarizeApiHealth, type ApiHealthStatus } from "@/hooks/useApiStatus";
import { recordAuditLog } from "@/lib/ops/audit";
import { calculateApiObservability, recordApiHealthMetrics } from "@/lib/ops/monitoring";
import { getScenarioPreset } from "@/lib/scenario/presets";
import { DEFAULT_SENSOR_FEEDS, SENSOR_ACCESS_NOTICE } from "@/lib/sensors/sensorAccess";
import { DATA_TIMESTAMP } from "@/mocks/data";
import { useScenario } from "@/store/scenario";

export const Route = createFileRoute("/ops/data-health")({
  head: () => ({
    meta: [{ title: "데이터 상태 — 현장정보" }],
  }),
  component: DataHealthPage,
});

function DataHealthPage() {
  const { scenarioPresetId, apiStatus, wmsStatus, geminiStatus } = useScenario();
  const { result: disasterMessagesResult } = useDisasterMessages({ region: "서울 강남구" });
  const [recordMessage, setRecordMessage] = useState("버튼을 누를 때만 상태 스냅샷을 기록합니다.");
  const preset = getScenarioPreset(scenarioPresetId);
  const items = useMemo<ApiHealthStatus[]>(
    () => [
      {
        name: "NAVER Directions 5",
        status: apiStatus,
        lastSuccess: apiStatus === "OK" ? DATA_TIMESTAMP : "확실한 정보 없음",
        lastError: apiStatus === "OK" ? undefined : "시나리오 preset에 따른 경로 fallback 상태",
      },
      {
        name: "TMAP 보행자 경로",
        status: apiStatus,
        lastSuccess: apiStatus === "OK" ? DATA_TIMESTAMP : "확실한 정보 없음",
        lastError:
          apiStatus === "OK" ? undefined : "시나리오 preset에 따른 보행 경로 fallback 상태",
      },
      {
        name: "기상청 초단기실황/단기예보",
        status: apiStatus,
        lastSuccess: DATA_TIMESTAMP,
        responseTime: 0,
        lastError: apiStatus === "OK" ? undefined : "실시간 호출 미검증",
      },
      {
        name: "행정안전부 긴급재난문자",
        status: disasterMessagesResult.status,
        lastSuccess:
          disasterMessagesResult.status === "OK"
            ? disasterMessagesResult.timestamp
            : "확실한 정보 없음",
        lastError: disasterMessagesResult.error,
      },
      {
        name: "생활안전지도 WMS",
        status: wmsStatus,
        lastSuccess: DATA_TIMESTAMP,
        responseTime: 0,
        lastError: wmsStatus === "OK" ? undefined : "시나리오 preset에 따른 WMS 대체 상태",
      },
      {
        name: "Gemini 안내문",
        status: geminiStatus,
        lastSuccess: geminiStatus === "OK" ? DATA_TIMESTAMP : "확실한 정보 없음",
        lastError: geminiStatus === "OK" ? undefined : "규칙 기반 문구 사용",
      },
    ],
    [apiStatus, disasterMessagesResult, geminiStatus, wmsStatus],
  );
  const summary = summarizeApiHealth(items);
  const observability = calculateApiObservability(items);

  const recordSnapshot = async () => {
    const metricResult = await recordApiHealthMetrics(items);
    const auditResult = await recordAuditLog({
      action: "OPS_ACTION",
      entityType: "api_health_snapshot",
      summary: `API 상태 스냅샷 기록: ${summary.worst}`,
      metadata: {
        total: summary.total,
        failed: summary.failed,
        degraded: summary.degraded,
        fallbackRatePercent: observability.fallbackRatePercent,
        averageResponseTimeMs: observability.averageResponseTimeMs,
      },
    });

    setRecordMessage(
      metricResult.ok && auditResult.ok
        ? "API 상태 스냅샷과 감사 로그를 기록했습니다."
        : metricResult.ok
          ? (auditResult.userMessage ?? "")
          : (metricResult.userMessage ?? ""),
    );
  };

  return (
    <OpsLayout
      title="데이터 상태"
      description={`현재 preset: ${preset.label} · ${preset.description}`}
      detail={<DataHealthDetail summary={summary} observability={observability} />}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.slice(0, 3).map((item) => (
          <ApiStatusCard key={item.name} item={item} />
        ))}
      </div>
      <section className="mt-4">
        <div className="mb-2">
          <h3 className="text-[16px] font-extrabold">API별 최신 상태</h3>
          <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">
            확인되지 않은 값은 “확실한 정보 없음”으로 표시합니다.
          </p>
        </div>
        <ApiStatusTable items={items} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--text-subtle)]" aria-live="polite">
            {recordMessage}
          </p>
          <button
            type="button"
            onClick={recordSnapshot}
            className="inline-flex min-h-11 items-center rounded-[8px] bg-[var(--primary)] px-4 text-[13px] font-extrabold text-white"
          >
            현재 상태 기록
          </button>
        </div>
      </section>
      <section className="mt-4 rounded-[8px] border border-[var(--border-soft)] bg-white p-4">
        <h3 className="text-[16px] font-extrabold">실시간 센서 연동 준비 상태</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
          {SENSOR_ACCESS_NOTICE}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {DEFAULT_SENSOR_FEEDS.map((feed) => (
            <div key={feed.id} className="rounded-[8px] bg-[var(--surface-alt)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold">{feed.name}</div>
                <span className="rounded bg-white px-2 py-0.5 text-[11px] font-extrabold text-[var(--text-subtle)]">
                  {feed.status}
                </span>
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-muted)]">
                제공기관 {feed.provider} · 출처 {feed.source}
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-subtle)]">
                최근 관측 {feed.lastObservedAt ?? "확실한 정보 없음"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </OpsLayout>
  );
}

function DataHealthDetail({
  summary,
  observability,
}: {
  summary: ReturnType<typeof summarizeApiHealth>;
  observability: ReturnType<typeof calculateApiObservability>;
}) {
  const meta = API_STATUS_META[summary.worst];

  return (
    <div className="space-y-4">
      <div>
        <div
          className="inline-flex rounded px-2 py-1 text-[12px] font-extrabold"
          style={{ background: meta.bg, color: meta.text }}
        >
          종합 {meta.label}
        </div>
        <h3 className="mt-2 text-[18px] font-extrabold">데이터 헬스 요약</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SummaryBox icon={Database} label="전체" value={`${summary.total}개`} />
        <SummaryBox icon={Activity} label="정상" value={`${summary.ok}개`} />
        <SummaryBox icon={AlertCircle} label="대체/지연" value={`${summary.degraded}개`} />
        <SummaryBox icon={AlertCircle} label="실패" value={`${summary.failed}개`} />
        <SummaryBox
          icon={Activity}
          label="Fallback 비율"
          value={`${observability.fallbackRatePercent}%`}
        />
        <SummaryBox
          icon={Activity}
          label="평균 응답"
          value={
            observability.averageResponseTimeMs == null
              ? "확실한 정보 없음"
              : `${observability.averageResponseTimeMs}ms`
          }
        />
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
        API key가 없는 항목은 실패로 숨기지 않고 fallback 상태를 표시합니다.
      </p>
    </div>
  );
}

function SummaryBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] bg-[var(--surface-alt)] p-3">
      <Icon size={15} className="text-[var(--primary)]" aria-hidden />
      <div className="mt-2 text-[11px] font-bold text-[var(--text-subtle)]">{label}</div>
      <div className="mt-0.5 text-[18px] font-extrabold tnum">{value}</div>
    </div>
  );
}
