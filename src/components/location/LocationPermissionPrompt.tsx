import React from "react";

export function LocationPermissionPrompt({
  onAllow,
  onDeny,
  isLoading = false,
}: {
  onAllow: () => void;
  onDeny: () => void;
  isLoading?: boolean;
}) {
  return (
    <section
      role="region"
      aria-label="위치 권한 요청"
      className="fixed inset-x-0 flex justify-center px-4"
      style={{
        bottom: "calc(72px + env(safe-area-inset-bottom))",
        zIndex: 45,
        pointerEvents: "none",
      }}
    >
      <div
        className="w-full max-w-[448px] border border-[var(--border-soft)] bg-white shadow-lg"
        style={{ borderRadius: 16, padding: 16, pointerEvents: "auto" }}
      >
        <h2 className="text-[18px] font-extrabold">현재 위치를 사용할까요?</h2>
        <p className="mt-2 text-[14px] text-[var(--text-muted)] leading-relaxed">
          위치를 허용하면 주변의 가까운 대피소와 위험 지역을 안내합니다. 위치 정보는 단말기 안에서만
          사용되며 저장되지 않습니다.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={onDeny}
            disabled={isLoading}
            className="h-[52px] rounded-[10px] border border-[var(--border)] bg-white font-bold text-[14px] disabled:opacity-50"
          >
            허용 안 함
          </button>
          <button
            onClick={onAllow}
            disabled={isLoading}
            className="h-[52px] rounded-[10px] bg-[var(--primary)] text-white font-extrabold text-[15px] disabled:opacity-50"
          >
            {isLoading ? "확인 중..." : "위치 허용"}
          </button>
        </div>
      </div>
    </section>
  );
}
