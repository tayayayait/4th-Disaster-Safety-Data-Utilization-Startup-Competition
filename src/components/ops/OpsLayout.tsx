import type { ReactNode } from "react";

import { OpsSidebar } from "@/components/ops/OpsSidebar";

export function OpsLayout({
  title,
  description,
  children,
  detail,
}: {
  title: string;
  description: string;
  children: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="ops-shell">
      <OpsSidebar />
      <section className="ops-main min-w-0 px-5 py-4">
        <div className="mb-4">
          <p className="text-[12px] font-bold text-[var(--text-subtle)]">현장정보</p>
          <h2 className="mt-1 text-[24px] font-extrabold tracking-normal">{title}</h2>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{description}</p>
        </div>
        {children}
      </section>
      <aside className="ops-detail-desktop border-l border-[var(--border-soft)] bg-white px-4 py-4">
        {detail}
      </aside>
      <aside className="ops-detail-drawer border-t border-[var(--border-soft)] bg-white px-4 py-4">
        {detail}
      </aside>
    </div>
  );
}
