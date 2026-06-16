import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { API_CACHE_TTL_MS } from "@/lib/api/cache";
import { fetchCctvFeeds, type CctvFeed, type CctvFeedsRequest } from "@/lib/api/cctvInfo";
import type { ApiResult } from "@/lib/api/types";
import type { LatLng } from "@/lib/types";

const pendingResult = (): ApiResult<CctvFeed[]> => ({
  data: [],
  status: "FALLBACK",
  timestamp: new Date(0).toISOString(),
  source: "ITS cctvInfo",
  error: `CCTV request pending`,
});

export const DEFAULT_CCTV_RADIUS_METERS = 5000;

export interface UseCctvFeedsProps {
  center?: LatLng;
  radiusMeters?: number;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number } | null;
  limit?: number;
  roadType?: CctvFeedsRequest["roadType"];
  requestId?: number;
  enabled?: boolean;
}

export function useCctvFeeds({
  center,
  radiusMeters = DEFAULT_CCTV_RADIUS_METERS,
  bounds,
  limit,
  roadType = "ex",
  requestId,
  enabled = true,
}: UseCctvFeedsProps) {
  const lastSuccessfulCamerasRef = useRef<CctvFeed[]>([]);
  const baseQueryKey = bounds
    ? [
        "cctv-info",
        "bounds",
        bounds.minX.toFixed(4),
        bounds.maxX.toFixed(4),
        bounds.minY.toFixed(4),
        bounds.maxY.toFixed(4),
        roadType,
        limit ?? "default",
      ]
    : center
      ? [
          "cctv-info",
          "center",
          center.lat.toFixed(4),
          center.lng.toFixed(4),
          radiusMeters,
          roadType,
          limit ?? "default",
        ]
      : ["cctv-info", "empty"];
  const queryKey = requestId === undefined ? baseQueryKey : [...baseQueryKey, "request", requestId];

  const query = useQuery({
    queryKey,
    staleTime: API_CACHE_TTL_MS.CCTV,
    placeholderData: keepPreviousData,
    enabled: enabled && (!!bounds || !!center),
    queryFn: async (): Promise<ApiResult<CctvFeed[]>> => {
      try {
        const limitArg = limit === undefined ? {} : { limit };
        const requestArgs = bounds
          ? { bounds, ...limitArg, roadType, cctvType: "4" as const }
          : { center, radiusMeters, ...limitArg, roadType, cctvType: "4" as const };

        const feeds = (await Promise.race([
          fetchCctvFeeds(requestArgs),
          new Promise((_, reject) => setTimeout(() => reject(new Error("API Timeout")), 15000)),
        ])) as CctvFeed[];

        return {
          data: feeds,
          status: "OK",
          timestamp: new Date().toISOString(),
          source: "ITS cctvInfo",
        };
      } catch (error) {
        console.warn("CCTV fetch failed:", error);
        return {
          ...pendingResult(),
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "CCTV API failed",
        };
      }
    },
  });

  const result = query.data ?? pendingResult();
  useEffect(() => {
    if (result.status === "OK") {
      lastSuccessfulCamerasRef.current = result.data ?? [];
    }
  }, [result]);

  const cameras = result.status === "OK" ? (result.data ?? []) : lastSuccessfulCamerasRef.current;

  return {
    cameras,
    result,
    isLoading: query.isLoading,
  };
}
