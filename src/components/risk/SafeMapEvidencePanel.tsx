import { AlertTriangle, MapPinned } from "lucide-react";

import type { SafeMapRiskEvidence } from "@/lib/risk/safemapEvidence";

const severityClass: Record<SafeMapRiskEvidence["severity"], string> = {
  WATCH: "bg-[var(--risk-watch-bg)] text-[var(--risk-watch-text)]",
  WARNING: "bg-[var(--risk-warning-bg)] text-[var(--risk-warning-text)]",
  CRITICAL: "bg-[var(--risk-critical-bg)] text-[var(--risk-critical-text)]",
};

export function SafeMapEvidencePanel({ evidence }: { evidence: SafeMapRiskEvidence[] }) {
  if (evidence.length === 0) return null;

  return (
    <section
      aria-label="위험 근거"
      className="border-t border-[var(--border-soft)] bg-white px-4 py-4"
    >
      <div className="flex items-center gap-2">
        <MapPinned size={17} className="text-[var(--primary)]" aria-hidden />
        <h2 className="text-[15px] font-extrabold text-[var(--text)]">위험 근거</h2>
      </div>

      <div className="mt-3 space-y-2">
        {evidence.map((item) => (
          <div
            key={item.id}
            className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--surface-alt)] px-3 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex min-h-6 items-center gap-1 rounded px-2 text-[11px] font-extrabold ${severityClass[item.severity]}`}
              >
                <AlertTriangle size={13} aria-hidden />
                {item.label}
              </span>
              <span className="text-[11px] font-bold text-[var(--text-subtle)]">
                {item.source} · feature {item.featureCount}
              </span>
            </div>
            <p className="mt-2 text-[13px] font-extrabold leading-snug text-[var(--text)]">
              {item.summary}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
