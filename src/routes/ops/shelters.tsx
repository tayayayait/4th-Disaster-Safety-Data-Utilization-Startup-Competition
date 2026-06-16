import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { OpsLayout } from "@/components/ops/OpsLayout";
import { DATA_TIMESTAMP } from "@/mocks/data";
import { useShelters } from "@/hooks/useShelters";
import { useScenario } from "@/store/scenario";
import { displayShelterStatus, toShelterOperation } from "@/lib/shelters/operationStatus";

export const Route = createFileRoute("/ops/shelters")({
  head: () => ({
    meta: [{ title: "대피소 — 현장정보" }],
  }),
  component: OpsSheltersPage,
});

function OpsSheltersPage() {
  const { origin } = useScenario();
  const { shelters, isLoading } = useShelters(origin);

  const operations = useMemo(
    () =>
      shelters
        .slice(0, 12)
        .map((shelter, index) =>
          toShelterOperation(
            shelter,
            index % 4 === 0 ? "2026-05-30T09:00:00+09:00" : DATA_TIMESTAMP,
            "행정안전부 API 연동",
          ),
        ),
    [shelters],
  );

  return (
    <OpsLayout
      title="대피소"
      description="대피소 운영 상태와 수용 규모를 한 화면에서 확인합니다."
      detail={
        <p className="text-[13px] text-[var(--text-muted)]">
          {isLoading ? "데이터 로딩 중..." : "대피소 상세 패널 준비 중"}
        </p>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {operations.map((shelter) => {
          const displayStatus = displayShelterStatus(
            shelter.status,
            shelter.checkedAt,
            new Date(DATA_TIMESTAMP),
          );

          return (
            <article
              key={shelter.id}
              className="rounded-[8px] border border-[var(--border-soft)] bg-white p-4"
            >
              <h3 className="text-[15px] font-extrabold">{shelter.name}</h3>
              <p className="mt-1 truncate text-[12px] text-[var(--text-muted)]">
                {shelter.address}
              </p>
              <div className="mt-3 text-[12px] font-bold text-[var(--text-subtle)] tnum">
                수용 {shelter.capacity.toLocaleString()}명 · {displayStatus}
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-subtle)]">
                최근 확인 {shelter.checkedAt ?? "확실한 정보 없음"} · 출처 {shelter.source}
              </div>
            </article>
          );
        })}
      </div>
    </OpsLayout>
  );
}
