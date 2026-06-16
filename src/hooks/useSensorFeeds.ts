import { useQuery } from "@tanstack/react-query";
import { fetchSensorFeeds } from "@/lib/sensors/sensorAccess";
import type { LatLng } from "@/lib/types";

export function useSensorFeeds(origin?: LatLng) {
  const query = useQuery({
    queryKey: [
      "sensor-feeds",
      origin ? origin.lat.toFixed(4) : "none",
      origin ? origin.lng.toFixed(4) : "none",
    ],
    queryFn: () => fetchSensorFeeds(origin),
    enabled: origin != null,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return {
    feeds: query.data ?? [],
    isLoading: query.isLoading,
    result: query,
  };
}
