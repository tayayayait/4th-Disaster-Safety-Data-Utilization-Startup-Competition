import type { AggregatedRiskZone } from "@/lib/ops/aggregateRiskZones";
import { RISK_META, riskClass } from "@/lib/risk";

export function RiskZoneTable({
  zones,
  selectedId,
  onSelect,
}: {
  zones: AggregatedRiskZone[];
  selectedId?: string;
  onSelect: (zone: AggregatedRiskZone) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--border-soft)] bg-white">
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-[var(--surface-alt)] text-[12px] text-[var(--text-muted)]">
            <tr className="h-11">
              <th className="px-4 text-left font-extrabold">위험지역</th>
              <th className="px-3 text-left font-extrabold">위험도</th>
              <th className="px-3 text-right font-extrabold">영향인원</th>
              <th className="px-3 text-right font-extrabold">대피소</th>
              <th className="px-4 text-left font-extrabold">주요 요인</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => {
              const active = zone.id === selectedId;
              const colors = riskClass(zone.level);

              return (
                <tr
                  key={zone.id}
                  className="h-11 cursor-pointer border-t border-[var(--border-soft)] hover:bg-[#F8FAFC]"
                  style={{ background: active ? "#EFF6FF" : undefined }}
                  onClick={() => onSelect(zone)}
                >
                  <td className="px-4 font-bold">{zone.name}</td>
                  <td className="px-3">
                    <span
                      className="rounded px-2 py-0.5 text-[11px] font-extrabold"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {RISK_META[zone.level].label}
                    </span>
                  </td>
                  <td className="px-3 text-right tnum">{zone.affectedPeople.toLocaleString()}명</td>
                  <td className="px-3 text-right tnum">{zone.impactShelters.length}곳</td>
                  <td className="max-w-[280px] truncate px-4 text-[var(--text-muted)]">
                    {zone.reasons[0] ?? "확실한 정보 없음"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
