import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientMap } from "@/components/map/ClientMap";
import { AddressFallback } from "@/components/location/AddressFallback";
import { ActionCard } from "@/components/risk/ActionCard";
import { SafeMapEvidencePanel } from "@/components/risk/SafeMapEvidencePanel";
import { WeatherPanel } from "@/components/risk/WeatherPanel";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";
import { LocationPermissionPrompt } from "@/components/location/LocationPermissionPrompt";
import { useScenario } from "@/store/scenario";
import { useWmsLayers } from "@/hooks/useWmsLayers";
import { DATA_TIMESTAMP } from "@/mocks/data";
import { formatDistance, haversineMeters } from "@/lib/utils";
import type { GeocodeResult } from "@/lib/geocoding";
import { useShelters } from "@/hooks/useShelters";
import { useRiskAssessment } from "@/hooks/useRiskAssessment";
import { useAiAdvice } from "@/hooks/useAiAdvice";
import { useRoutes } from "@/hooks/useRoutes";
import { useTrafficEvents } from "@/hooks/useTrafficEvents";
import { useCctvFeeds } from "@/hooks/useCctvFeeds";
import { Camera } from "lucide-react";
import type { GeminiRouteExplanationInput } from "@/lib/api/gemini";
import type { RouteMode, RouteResult, Shelter } from "@/lib/types";
import { WmsLegend } from "@/components/map/WmsLegend";

export { LocationPermissionPrompt };

const HOME_SHELTER_STATUS_LABEL: Record<Shelter["status"], string> = {
  OPERATING: "운영중",
  CHECK_REQUIRED: "확인필요",
  EXCLUDED: "제외권고",
};

const HOME_ROUTE_STATUS_LABEL: Record<RouteResult["status"], string> = {
  RECOMMENDED: "추천",
  ALTERNATIVE: "대안",
  REJECTED: "제외",
  LOADING: "계산중",
  FAILED: "실패",
};

const HOME_ROUTE_MODE_LABEL: Record<RouteMode, string> = {
  WALK: "도보",
  DRIVE: "차량",
};

type HomeCctvBounds = { minX: number; maxX: number; minY: number; maxY: number };

const HOME_CCTV_LIMIT = 120;
const HOME_CCTV_BOUNDS_EPSILON = 0.0005;

const areHomeCctvBoundsSimilar = (a: HomeCctvBounds | null, b: HomeCctvBounds) =>
  !!a &&
  Math.abs(a.minX - b.minX) < HOME_CCTV_BOUNDS_EPSILON &&
  Math.abs(a.maxX - b.maxX) < HOME_CCTV_BOUNDS_EPSILON &&
  Math.abs(a.minY - b.minY) < HOME_CCTV_BOUNDS_EPSILON &&
  Math.abs(a.maxY - b.maxY) < HOME_CCTV_BOUNDS_EPSILON;

const formatOverlapEvidence = (label: string, value?: number) => {
  if (!value || value <= 0) return null;
  return `${label} ${Math.round(value * 100)}%`;
};

const uniqueEvidence = (items: Array<string | null | undefined>) => [
  ...new Set(items.filter((item): item is string => Boolean(item))),
];

const selectHomeRoute = (routes: RouteResult[]) =>
  routes.find((route) => route.status === "RECOMMENDED") ??
  routes.find((route) => route.status !== "REJECTED") ??
  routes[0];

const routeTimestamp = (
  route: RouteResult | undefined,
  results: ReturnType<typeof useRoutes>["results"],
) => {
  if (!route) return DATA_TIMESTAMP;
  return route.mode === "WALK" ? results.walk.timestamp : results.drive.timestamp;
};

const buildRouteEvidence = (route: RouteResult | undefined) => {
  if (!route) return [];
  const statusLabel = HOME_ROUTE_STATUS_LABEL[route.status];
  const modeLabel = HOME_ROUTE_MODE_LABEL[route.mode];
  return [
    `${statusLabel} ${modeLabel} 경로 ${route.name}`,
    `안전점수 ${route.safetyScore}점`,
    ...route.riskReasons,
  ];
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "침수퇴로 AI — 홈" },
      {
        name: "description",
        content: "현재 위치 기준 침수 위험도와 가장 안전한 대피소·경로를 한 화면에서 확인하세요.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { riskLevel, origin, locationStatus, setLocationStatus, setOrigin, apiStatus } =
    useScenario();
  const [showPerm, setShowPerm] = useState(locationStatus === "PROMPT");
  const [hydrated, setHydrated] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [showCctv, setShowCctv] = useState(true);
  const [mapBounds, setMapBounds] = useState<HomeCctvBounds | null>(null);
  const wmsLayers = useWmsLayers();
  const hasSelectedLocation = locationStatus === "GRANTED";

  const breakdown = useRiskAssessment(origin);
  const updateMapBounds = useCallback((nextBounds: HomeCctvBounds) => {
    setMapBounds((currentBounds) =>
      areHomeCctvBoundsSimilar(currentBounds, nextBounds) ? currentBounds : nextBounds,
    );
  }, []);

  const { cameras: cctvCameras } = useCctvFeeds({
    center: origin,
    bounds: mapBounds,
    limit: HOME_CCTV_LIMIT,
    enabled: showCctv && hasSelectedLocation,
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (locationStatus !== "GRANTED") {
      setSelectedShelterId(null);
    }
    if (locationStatus === "PROMPT") {
      setShowPerm(true);
    }
  }, [locationStatus]);

  const { shelters, isLoading: isSheltersLoading } = useShelters(origin);
  const { events: trafficEvents } = useTrafficEvents(origin);

  const shelterOptions = useMemo(() => {
    return [...shelters]
      .map((s) => ({
        s,
        d: haversineMeters(origin, s.position),
      }))
      .sort((a, b) => a.d - b.d);
  }, [origin, shelters]);

  const selectedShelter = useMemo(
    () => shelters.find((shelter) => shelter.id === selectedShelterId),
    [selectedShelterId, shelters],
  );

  useEffect(() => {
    if (!selectedShelterId) return;
    if (shelterOptions.some(({ s }) => s.id === selectedShelterId)) return;
    setSelectedShelterId(null);
  }, [shelterOptions, selectedShelterId]);

  const fallbackRecommended = useMemo(() => {
    if (shelterOptions.length === 0) return undefined;
    return (
      shelterOptions.find(({ s }) => s.id === selectedShelterId) ??
      shelterOptions.find(({ s }) => s.status !== "EXCLUDED") ??
      shelterOptions[0]
    );
  }, [shelterOptions, selectedShelterId]);

  const routeShelters = useMemo(
    () => (selectedShelter ? [selectedShelter] : shelters),
    [selectedShelter, shelters],
  );

  const routeState = useRoutes({
    origin,
    shelters: routeShelters,
    trafficEvents,
    enabled: hasSelectedLocation && routeShelters.length > 0,
  });

  const homeRoute = useMemo(() => selectHomeRoute(routeState.routes), [routeState.routes]);
  const routes = useMemo(
    () => (homeRoute && homeRoute.status !== "REJECTED" ? [homeRoute] : []),
    [homeRoute],
  );
  const routeShelter = useMemo(
    () => shelters.find((shelter) => shelter.id === homeRoute?.shelterId),
    [homeRoute?.shelterId, shelters],
  );
  const recommended = useMemo(() => {
    if (homeRoute && routeShelter) {
      return { s: routeShelter, d: homeRoute.distanceMeters };
    }
    return fallbackRecommended;
  }, [fallbackRecommended, homeRoute, routeShelter]);

  const aiRouteReasons = useMemo(
    () =>
      uniqueEvidence([
        ...buildRouteEvidence(homeRoute),
        ...breakdown.reasons,
        formatOverlapEvidence("생활안전지도 침수흔적 중첩", breakdown.floodTraceOverlap),
        formatOverlapEvidence("생활안전지도 하천범람 중첩", breakdown.riverFloodOverlap),
      ]),
    [breakdown.floodTraceOverlap, breakdown.reasons, breakdown.riverFloodOverlap, homeRoute],
  );

  const aiInput = useMemo<GeminiRouteExplanationInput | null>(() => {
    if (!recommended || !homeRoute) return null;
    const statusLabel = HOME_ROUTE_STATUS_LABEL[homeRoute.status];
    const modeLabel = HOME_ROUTE_MODE_LABEL[homeRoute.mode];
    return {
      question: `기상청 특보, 하천 수위, 침수위험지도, 통제 정보 등을 근거로, ${statusLabel} ${modeLabel} 경로인 ${homeRoute.name}로 ${recommended.s.name}까지 이동할 때 추천 이유와 실제 위험 구간을 구체적으로 설명해줘. 안전점수 ${homeRoute.safetyScore}점.`,
      riskLevel,
      recommendedRouteId: homeRoute.id,
      recommendedShelterId: recommended.s.id,
      shelterName: recommended.s.name,
      distanceMeters: homeRoute.distanceMeters,
      routeReasons: aiRouteReasons,
      dataTimestamp: routeTimestamp(homeRoute, routeState.results),
      allowedProperNouns: [
        homeRoute.name,
        recommended.s.name,
        recommended.s.address,
        breakdown.region,
        statusLabel,
        modeLabel,
        ...homeRoute.riskReasons,
      ],
    };
  }, [aiRouteReasons, recommended, riskLevel, homeRoute, breakdown, routeState.results]);

  const { data: aiAdvice, isLoading: isAiLoading } = useAiAdvice(aiInput);

  if (!hydrated) return <HomeSkeleton />;

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

  return (
    <div className="flex flex-col flex-1 relative">
      {riskLevel === "CRITICAL" && <CriticalWarningBanner />}

      {hasSelectedLocation && (
        <div
          style={{ height: "calc(100vh - 56px - 64px - 240px)", minHeight: 240 }}
          className="relative"
        >
          <ClientMap
            center={origin}
            zoom={14}
            shelters={shelters}
            routes={routes}
            wmsLayers={wmsLayers}
            selectedShelterId={selectedShelterId}
            onShelterClick={(shelter) => setSelectedShelterId(shelter.id)}
            showCurrentLocationButton
            onCurrentLocationClick={requestLocation}
            isCurrentLocationLoading={isRequestingLocation}
            cctvs={showCctv ? cctvCameras : []}
            trafficEvents={trafficEvents}
            onBoundsChanged={updateMapBounds}
          />
          <button
            type="button"
            onClick={() => setShowCctv(!showCctv)}
            className={`absolute left-3 top-3 inline-flex h-10 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-extrabold shadow-sm z-[1000] transition-colors ${
              showCctv
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border-soft)] bg-white/95 text-[var(--text)]"
            }`}
            aria-pressed={showCctv}
            aria-label="CCTV 켜기/끄기"
          >
            <Camera size={16} aria-hidden />
            CCTV {showCctv ? "끄기" : "켜기"}
          </button>
          
          <WmsLegend />
        </div>
      )}

      {hasSelectedLocation && (
        <ShelterPicker
          shelters={shelterOptions}
          selectedShelterId={selectedShelterId}
          isLoading={isSheltersLoading}
          onSelect={setSelectedShelterId}
        />
      )}

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
        <ActionCard
          level={riskLevel}
          shelter={recommended?.s}
          distanceMeters={recommended?.d}
          timestamp={DATA_TIMESTAMP}
          apiStatus={routeState.apiStatus ?? apiStatus}
          aiAdvice={aiAdvice ?? undefined}
          isAiLoading={isAiLoading}
          shelterLabel={selectedShelterId ? "선택 대피소" : "추천 대피소"}
        />
      )}

      {hasSelectedLocation && <WeatherPanel weather={breakdown.weather} />}
      {hasSelectedLocation && <SafeMapEvidencePanel evidence={breakdown.safeMapEvidence} />}

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

export function ShelterPicker({
  shelters,
  selectedShelterId,
  isLoading = false,
  onSelect,
}: {
  shelters: Array<{ s: Shelter; d: number }>;
  selectedShelterId: string | null;
  isLoading?: boolean;
  onSelect: (shelterId: string | null) => void;
}) {
  const selected = selectedShelterId
    ? shelters.find(({ s }) => s.id === selectedShelterId)
    : undefined;
  const disabled = isLoading || shelters.length === 0;

  return (
    <section
      aria-label="대피시설 선택"
      className="border-b border-[var(--border-soft)] bg-white px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold text-[var(--text-subtle)]">대피시설</div>
          <div className="mt-0.5 truncate text-[13px] font-bold text-[var(--text)]">
            {selected
              ? `${selected.s.name} · ${HOME_SHELTER_STATUS_LABEL[selected.s.status]}`
              : "가까운 대피소 자동 추천"}
          </div>
        </div>
        <select
          aria-label="홈 대피시설 선택"
          value={selectedShelterId ?? ""}
          disabled={disabled}
          onChange={(event) => onSelect(event.target.value || null)}
          className="h-10 max-w-[190px] rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px] font-bold text-[var(--text)] disabled:opacity-60"
        >
          <option value="">{isLoading ? "불러오는 중..." : "자동 추천"}</option>
          {shelters.map(({ s, d }) => (
            <option key={s.id} value={s.id}>
              {s.name} · {HOME_SHELTER_STATUS_LABEL[s.status]} · {formatDistance(d)}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function CriticalWarningBanner() {
  return (
    <div
      role="alert"
      className="bg-[var(--risk-critical-text)] px-4 py-3 text-[13px] font-extrabold text-white"
    >
      심각 단계입니다. 침수·통제 위험 구간을 피하고 가장 가까운 안전 경로를 우선 확인하세요.
    </div>
  );
}
