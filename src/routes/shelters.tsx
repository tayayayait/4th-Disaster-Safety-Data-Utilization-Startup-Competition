import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useScenario } from "@/store/scenario";
import { useShelters } from "@/hooks/useShelters";
import { formatDistance, formatDuration, haversineMeters } from "@/lib/utils";
import type { Shelter, ShelterStatus } from "@/lib/types";
import { AddressFallback } from "@/components/location/AddressFallback";
import { LocationPermissionPrompt } from "@/components/location/LocationPermissionPrompt";
import type { GeocodeResult } from "@/lib/geocoding";

export const Route = createFileRoute("/shelters")({
  head: () => ({
    meta: [
      { title: "대피소 — 침수퇴로 AI" },
      {
        name: "description",
        content: "도달 가능성 점수가 높은 순으로 대피소를 안내합니다.",
      },
    ],
  }),
  component: SheltersPage,
});

function reachabilityScore(s: Shelter, distance: number) {
  // 100 - 거리패널티 - 운영불명 - 지하시설
  const distancePenalty = Math.min(60, distance / 50); // 3km=60
  const opPenalty = s.status === "CHECK_REQUIRED" ? 15 : 0;
  const undergroundPenalty = s.underground ? 25 : 0;
  const excludedPenalty = s.status === "EXCLUDED" ? 40 : 0;
  return Math.max(
    0,
    Math.round(100 - distancePenalty - opPenalty - undergroundPenalty - excludedPenalty),
  );
}

function SheltersPage() {
  const { origin, locationStatus, setLocationStatus, setOrigin } = useScenario();
  const [selected, setSelected] = useState<Shelter | null>(null);
  const { shelters, isLoading } = useShelters(origin);
  const [showPerm, setShowPerm] = useState(locationStatus === "PROMPT");
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const hasSelectedLocation = locationStatus === "GRANTED";

  useEffect(() => {
    if (locationStatus === "PROMPT") {
      setShowPerm(true);
    }
  }, [locationStatus]);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      setLocationStatus("ERROR");
      setShowPerm(false);
      return;
    }

    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("GRANTED");
        setShowPerm(false);
        setIsRequestingLocation(false);
      },
      (error) => {
        setIsRequestingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("위치 정보 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
        } else if (error.code === error.TIMEOUT) {
          alert("위치 정보를 가져오는데 시간이 너무 오래 걸렸습니다. 다시 시도해주세요.");
        } else {
          alert("위치 정보를 가져오지 못했습니다: " + error.message);
        }
        setLocationStatus("DENIED");
        setShowPerm(false);
      },
      { timeout: 15000, enableHighAccuracy: true },
    );
  }

  const sorted = useMemo(() => {
    return shelters
      .map((s) => {
        const d = haversineMeters(origin, s.position);
        return { s, distance: d, score: reachabilityScore(s, d) };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [origin, shelters]);

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-[20px] font-extrabold">가까운 대피소</h2>
        <p className="text-[12px] text-[var(--text-subtle)] mt-1">
          {isLoading
            ? "대피소 목록을 불러오는 중..."
            : hasSelectedLocation
              ? `거리 오름차순 · ${sorted.length}개`
              : "대피소 목록을 불러오기 위해 위치를 설정해주세요"}
        </p>
      </div>

      {!hasSelectedLocation && (
        <div className="px-4 py-4 pb-[220px]">
          <AddressFallback
            onSelect={(result: GeocodeResult) => {
              setOrigin(result.position);
              setLocationStatus("GRANTED");
              setShowPerm(false);
            }}
          />
        </div>
      )}

      {hasSelectedLocation && (
        <ul className="px-4 flex flex-col gap-3 pb-4">
          {sorted.map(({ s, distance, score }) => (
            <li key={s.id}>
              <button
                onClick={() => setSelected(s)}
                className="w-full text-left bg-white border rounded-[12px] p-4"
                style={{ borderColor: "var(--border-soft)", minHeight: 112 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold truncate">{s.name}</h3>
                    <p className="text-[13px] text-[var(--text-muted)] mt-0.5 truncate">
                      {s.address}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-[13px] tnum text-[var(--text-muted)]">
                  <span>{formatDistance(distance)}</span>
                  <span>도보 {formatDuration(distance / 1.3)}</span>
                  <span>수용 {s.capacity.toLocaleString()}명</span>
                  <span className="ml-auto font-extrabold text-[var(--text)]">{score}점</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <ShelterSheet shelter={selected} onClose={() => setSelected(null)} />}

      {showPerm && !hasSelectedLocation && (
        <LocationPermissionPrompt
          onAllow={requestLocation}
          onDeny={() => {
            setLocationStatus("DENIED");
            setShowPerm(false);
          }}
          isLoading={isRequestingLocation}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ShelterStatus }) {
  const map = {
    OPERATING: { bg: "#dcfce7", text: "#166534", label: "운영중" },
    CHECK_REQUIRED: { bg: "#fef9c3", text: "#854d0e", label: "확인필요" },
    EXCLUDED: { bg: "#fee2e2", text: "#991b1b", label: "제외권고" },
  }[status];
  return (
    <span
      className="text-[12px] font-extrabold rounded-full px-2 py-1 shrink-0"
      style={{ background: map.bg, color: map.text }}
    >
      {map.label}
    </span>
  );
}

function ShelterSheet({ shelter, onClose }: { shelter: Shelter; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${shelter.name} 상세`}
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 100, background: "rgba(15,23,42,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[480px]"
        style={{ borderRadius: "16px 16px 0 0", padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[18px] font-extrabold">{shelter.name}</h2>
          <StatusBadge status={shelter.status} />
        </div>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">{shelter.address}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <Field label="시설 유형" value={shelter.type} />
          <Field label="수용 인원" value={`${shelter.capacity.toLocaleString()}명`} />
          <Field label="위치 유형" value={shelter.underground ? "지하" : "지상"} />
          <Field
            label="운영 상태"
            value={
              shelter.status === "CHECK_REQUIRED"
                ? "확실한 정보 없음"
                : shelter.status === "EXCLUDED"
                  ? "침수 위험 — 제외 권고"
                  : "운영"
            }
          />
        </dl>
        <button
          onClick={onClose}
          className="mt-5 w-full h-[52px] rounded-[10px] bg-[var(--primary)] text-white font-extrabold"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-[var(--text-subtle)]">{label}</dt>
      <dd className="font-bold mt-0.5">{value}</dd>
    </div>
  );
}
