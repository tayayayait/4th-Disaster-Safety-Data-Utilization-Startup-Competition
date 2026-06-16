import { useQuery } from "@tanstack/react-query";
import type { Shelter, LatLng } from "@/lib/types";
import { fetchShelters } from "@/lib/shelters/shelterApi";
import { haversineMeters } from "@/lib/utils";

export function useShelters(origin: LatLng, radiusMeters: number = 5000) {
  const isBrowser = typeof window !== "undefined";
  const query = useQuery({
    queryKey: ["shelters", origin.lat.toFixed(4), origin.lng.toFixed(4)],
    enabled: isBrowser,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      return await fetchShelters(origin);
    },
  });

  const allShelters = query.data ?? [];
  const nearbyShelters = allShelters.filter(
    (s) => haversineMeters(origin, s.position) <= radiusMeters,
  );

  const finalShelters = nearbyShelters.length > 0 ? nearbyShelters : allShelters;

  return {
    shelters: finalShelters,
    isLoading: query.isLoading,
    error: query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load shelters"
      : null,
  };
}
