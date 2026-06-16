import { AlertTriangle } from "lucide-react";

export function EmergencyBar({ onAction }: { onAction?: () => void }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4"
      style={{ bottom: 64, zIndex: 60 }}
    >
      <button
        onClick={onAction}
        className="w-full flex items-center justify-center gap-2 text-white font-extrabold"
        style={{
          background: "#dc2626",
          height: 52,
          borderRadius: 12,
          fontSize: 15,
          boxShadow: "0 -4px 18px rgba(220,38,38,0.35)",
        }}
      >
        <AlertTriangle size={20} aria-hidden />
        가장 안전한 경로 시작
      </button>
    </div>
  );
}
