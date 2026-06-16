import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { OpsDetailPanel } from "@/components/ops/OpsDetailPanel";
import { OpsLayout } from "@/components/ops/OpsLayout";
import { RiskZoneTable } from "@/components/ops/RiskZoneTable";
import { aggregateRiskZones } from "@/lib/ops/aggregateRiskZones";
import { RISK_ZONES, SHELTERS } from "@/mocks/data";

export const Route = createFileRoute("/ops/risk-zones")({
  head: () => ({
    meta: [{ title: "위험지역 — 현장정보" }],
  }),
  component: RiskZonesPage,
});

function RiskZonesPage() {
  const zones = useMemo(() => aggregateRiskZones(RISK_ZONES, SHELTERS), []);
  const [selectedId, setSelectedId] = useState(zones[0]?.id);
  const selectedZone = zones.find((zone) => zone.id === selectedId) ?? zones[0] ?? null;

  return (
    <OpsLayout
      title="위험지역"
      description="침수흔적, 하천범람, 통제 후보 지역을 우선순위로 확인합니다."
      detail={<OpsDetailPanel zone={selectedZone} />}
    >
      <RiskZoneTable
        zones={zones}
        selectedId={selectedZone?.id}
        onSelect={(zone) => setSelectedId(zone.id)}
      />
    </OpsLayout>
  );
}
