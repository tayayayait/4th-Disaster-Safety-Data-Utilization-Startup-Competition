import { Link, useLocation } from "@tanstack/react-router";
import { Camera } from "lucide-react";

const OPS_NAV = [{ to: "/ops/cctv", label: "CCTV", icon: Camera }] as const;

export function OpsSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="ops-sidebar bg-white border-r border-[var(--border-soft)]">
      <div className="px-4 py-4 border-b border-[var(--border-soft)]">
        <div className="text-[12px] font-bold text-[var(--text-subtle)]">공개 현장정보</div>
        <div className="mt-1 text-[18px] font-extrabold">전국 CCTV</div>
      </div>
      <nav className="ops-nav p-3" aria-label="현장정보 메뉴">
        {OPS_NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === "/ops" || pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="ops-nav-item flex items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-bold"
              style={{
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#fff" : "var(--text-muted)",
              }}
            >
              <Icon size={16} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
