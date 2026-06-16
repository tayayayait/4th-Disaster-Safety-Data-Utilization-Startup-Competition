import { useQuery } from "@tanstack/react-query";
import { API_CACHE_TTL_MS } from "@/lib/api/cache";
import type { LatLng } from "@/lib/types";
import {
  createBoundsFromCenter,
  SAFE_MAP_FLOOD_TRACE_WMS_LAYER,
  SAFE_MAP_RIVER_FLOOD_WMS_LAYER,
} from "@/lib/map/wms";
import { fetchWmsGetFeatureInfo } from "@/lib/api/wmsFeatureInfo";
import { buildSafeMapEvidence } from "@/lib/risk/safemapEvidence";

const emptyFeatureInfo = { overlap: 0, features: [] };

export function useWmsOverlap(origin: LatLng) {
  // 공공데이터 API(WMS GetFeatureInfo) 차단으로 인해 항상 0(없음)을 반환하도록 기능 축소
  return {
    floodTraceOverlap: 0,
    riverFloodOverlap: 0,
    safeMapEvidence: [],
  };
}
