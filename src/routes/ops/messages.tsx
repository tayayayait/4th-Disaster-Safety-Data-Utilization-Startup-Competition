import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { NoticeGenerator } from "@/components/ops/NoticeGenerator";
import { OpsLayout } from "@/components/ops/OpsLayout";
import { aggregateRiskZones } from "@/lib/ops/aggregateRiskZones";
import { recordAuditLog } from "@/lib/ops/audit";
import { DATA_TIMESTAMP, RISK_ZONES, SHELTERS } from "@/mocks/data";

export const Route = createFileRoute("/ops/messages")({
  head: () => ({
    meta: [{ title: "주민 안내문 — 현장정보" }],
  }),
  component: OpsMessagesPage,
});

function OpsMessagesPage() {
  const [generated, setGenerated] = useState("");
  const [verified, setVerified] = useState(false);
  const [zone] = useMemo(() => aggregateRiskZones(RISK_ZONES, SHELTERS), []);
  const region = zone?.name ?? "서울 강남구";
  const recommendedAction = "침수 위험 구간을 피하고 지정 대피소로 이동하세요.";

  return (
    <OpsLayout
      title="주민 안내문"
      description="위험지역과 추천 행동을 바탕으로 주민 안내문을 생성합니다."
      detail={<NoticePreview notice={generated} verified={verified} />}
    >
      <NoticeGenerator
        region={region}
        riskLevel={zone?.level ?? "UNKNOWN"}
        riskFactors={zone?.reasons ?? []}
        recommendedAction={recommendedAction}
        dataTimestamp={DATA_TIMESTAMP}
        allowedProperNouns={[
          region,
          "서울 강남구",
          "강남구",
          "강남역",
          "탄천",
          "역삼동",
          ...(zone?.impactShelters.map((shelter) => shelter.name) ?? []),
        ]}
        onGenerated={(notice, isVerified) => {
          setGenerated(notice);
          setVerified(isVerified);
          void recordAuditLog({
            action: "NOTICE_GENERATION",
            entityType: "ops_notice",
            entityId: region,
            summary: isVerified ? "Gemini 안내문 생성" : "규칙 기반 안내문 생성",
            metadata: {
              region,
              riskLevel: zone?.level ?? "UNKNOWN",
              verified: isVerified,
              length: notice.length,
              dataTimestamp: DATA_TIMESTAMP,
            },
          });
        }}
      />
    </OpsLayout>
  );
}

function NoticePreview({ notice, verified }: { notice: string; verified: boolean }) {
  if (!notice) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        안내문을 생성하면 이 영역에 검증 상태와 초안이 표시됩니다.
      </p>
    );
  }

  return (
    <div>
      <div className="text-[12px] font-extrabold text-[var(--text-subtle)]">
        {verified ? "Gemini 생성·검증 완료" : "규칙 기반 안내문"}
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-[8px] bg-[var(--surface-alt)] p-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
        {notice}
      </pre>
    </div>
  );
}
