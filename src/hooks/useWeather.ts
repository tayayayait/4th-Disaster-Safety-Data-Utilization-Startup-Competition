import { useQuery } from "@tanstack/react-query";

import {
  buildKmaWeatherRequest,
  fetchWeatherSnapshot,
  type WeatherEdgeFetcher,
} from "@/lib/api/weather";
import { API_CACHE_TTL_MS } from "@/lib/api/cache";
import type { ApiResult, WeatherSnapshot } from "@/lib/api/types";
import type { LatLng } from "@/lib/types";

interface UseWeatherOptions {
  origin: LatLng;
  now?: Date;
  client?: WeatherEdgeFetcher;
}

const failedWeatherResult = (error: unknown): ApiResult<WeatherSnapshot> => ({
  data: null,
  status: "FAILED",
  timestamp: new Date().toISOString(),
  source: "kma-weather",
  error: error instanceof Error ? error.message : "Weather API failed",
});

export const useWeather = ({ origin, now, client }: UseWeatherOptions) => {
  const request = buildKmaWeatherRequest({ origin, now });
  const query = useQuery({
    queryKey: ["weather", request.nx, request.ny, request.baseDate, request.baseTime],
    staleTime: API_CACHE_TTL_MS.WEATHER_CURRENT,
    queryFn: async (): Promise<ApiResult<WeatherSnapshot>> => {
      const data = await fetchWeatherSnapshot(request, client);
      return {
        data,
        status: "OK",
        timestamp: new Date().toISOString(),
        source: "kma-weather",
      };
    },
    retry: 2,
    retryDelay: 1000,
  });

  return {
    result: query.data ?? {
      data: null,
      status: "FAILED",
      timestamp: new Date(0).toISOString(),
      source: "kma-weather",
      error: query.isError
        ? query.error instanceof Error
          ? query.error.message
          : "Weather API failed"
        : "Weather request is loading",
    },
    isLoading: query.isLoading,
  };
};
