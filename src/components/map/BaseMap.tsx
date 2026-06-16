"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import type { LatLng, RiskZone, RouteResult, Shelter } from "@/lib/types";
import { riskClass } from "@/lib/risk";
import { formatDistance, haversineMeters } from "@/lib/utils";

interface BaseMapProps {
  center: LatLng;
  zoom?: number;
  shelters?: Shelter[];
  riskZones?: RiskZone[];
  routes?: RouteResult[];
  height?: number | string;
  onShelterClick?: (s: Shelter) => void;
}

const ROUTE_STYLE: Record<
  RouteResult["status"],
  { stroke: string; width: number; dash?: string; opacity: number }
> = {
  RECOMMENDED: { stroke: "var(--route-recommended)", width: 6, opacity: 1 },
  ALTERNATIVE: { stroke: "var(--route-alternative)", width: 4, opacity: 0.9 },
  REJECTED: {
    stroke: "var(--route-rejected)",
    width: 4,
    dash: "6 4",
    opacity: 0.9,
  },
  LOADING: { stroke: "#94a3b8", width: 3, opacity: 0.4 },
  FAILED: { stroke: "#94a3b8", width: 3, opacity: 0.4 },
};

const clamp = (value: number) => Math.max(4, Math.min(96, value));

const projectPoint = (center: LatLng, point: LatLng) => ({
  x: clamp(50 + (point.lng - center.lng) * 1200),
  y: clamp(50 - (point.lat - center.lat) * 1600),
});

const polygonPoints = (center: LatLng, polygon: Array<[number, number]>) =>
  polygon
    .map(([lng, lat]) => {
      const p = projectPoint(center, { lat, lng });
      return `${p.x},${p.y}`;
    })
    .join(" ");

const routePoints = (center: LatLng, route: RouteResult) =>
  route.geometry
    .map((point) => {
      const p = projectPoint(center, point);
      return `${p.x},${p.y}`;
    })
    .join(" ");

const getShelterColor = (status: Shelter["status"]) => {
  if (status === "EXCLUDED") return "#dc2626";
  if (status === "CHECK_REQUIRED") return "#ca8a04";
  return "var(--primary)";
};

const SHELTER_STATUS_LABEL: Record<Shelter["status"], string> = {
  OPERATING: "운영중",
  CHECK_REQUIRED: "확인필요",
  EXCLUDED: "제외권고",
};

export function BaseMap({
  center,
  shelters = [],
  riskZones = [],
  routes = [],
  height = "100%",
  onShelterClick,
}: BaseMapProps) {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const mapStyle: CSSProperties = {
    height,
    width: "100%",
    minHeight: typeof height === "number" ? undefined : 220,
  };
  const current = projectPoint(center, center);

  return (
    <div
      className="relative overflow-hidden bg-[#e8f0f7]"
      style={mapStyle}
      role="img"
      aria-label="대피소와 위험구역을 표시한 지도"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100">
        {riskZones.map((zone) => {
          const colors = riskClass(zone.level);
          return (
            <polygon
              key={zone.id}
              points={polygonPoints(center, zone.polygon)}
              fill={colors.overlay}
              stroke={colors.text}
              strokeWidth="0.6"
              aria-label={`${zone.name} 위험구역`}
            />
          );
        })}

        {routes.map((route) => {
          const style = ROUTE_STYLE[route.status];
          return (
            <polyline
              key={route.id}
              points={routePoints(center, route)}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={style.opacity}
              aria-label={`${route.name} 경로선`}
            />
          );
        })}
      </svg>

      {shelters.map((shelter) => {
        const p = projectPoint(center, shelter.position);
        return (
          <button
            key={shelter.id}
            type="button"
            aria-label={`대피소: ${shelter.name}`}
            title={shelter.name}
            onClick={() => {
              setSelectedShelter(shelter);
              onShelterClick?.(shelter);
            }}
            className="absolute grid place-items-center rounded-full border-2 border-white text-white shadow-sm"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: 28,
              height: 28,
              background: getShelterColor(shelter.status),
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="text-[11px] font-black" aria-hidden>
              대
            </span>
          </button>
        );
      })}

      <div
        aria-label="현재 위치"
        title="현재 위치"
        className="absolute rounded-full border-[3px] border-white bg-[var(--primary)] shadow"
        style={{
          left: `${current.x}%`,
          top: `${current.y}%`,
          width: 18,
          height: 18,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="absolute left-3 bottom-3 rounded bg-white/90 px-2 py-1 text-[11px] font-bold text-[var(--text-muted)] shadow-sm">
        Phase 1에서 네이버 지도 SDK로 교체 예정
      </div>

      {selectedShelter && (
        <div
          role="dialog"
          aria-label={`${selectedShelter.name} 대피소 상세`}
          className="absolute inset-x-3 bottom-12 rounded-[14px] border border-[var(--border-soft)] bg-white p-4 shadow-lg"
          style={{ zIndex: 20 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-extrabold">{selectedShelter.name}</h2>
              <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                {selectedShelter.address}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedShelter(null)}
              className="min-h-[32px] shrink-0 rounded-md border border-[var(--border)] px-2 text-[12px] font-bold"
            >
              닫기
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
            <div>
              <dt className="text-[var(--text-subtle)]">거리</dt>
              <dd className="mt-0.5 font-bold">
                {formatDistance(haversineMeters(center, selectedShelter.position))}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-subtle)]">운영상태</dt>
              <dd className="mt-0.5 font-bold">{SHELTER_STATUS_LABEL[selectedShelter.status]}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-subtle)]">수용</dt>
              <dd className="mt-0.5 font-bold">{selectedShelter.capacity.toLocaleString()}명</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
