import { supabase } from "@/integrations/supabase/client";
import type { Shelter, LatLng } from "@/lib/types";
import { DEMO_CENTER, SHELTERS as MOCK_SHELTERS } from "@/mocks/data";
import { deriveFloodShelterStatus } from "@/lib/shelters/operationStatus";
import { haversineMeters } from "@/lib/utils";

const TEMPORARY_HOUSING_TYPE = "이재민 임시주거시설";
const STATIC_SHELTER_RADIUS_METERS = 5000;
const STATIC_SHELTER_LIMIT = 100;
const DEMO_FALLBACK_RADIUS_METERS = 10000;

const isFloodEvacuationCandidate = (shelter: Shelter) =>
  !shelter.type.includes("민방위") && shelter.status !== "EXCLUDED" && !shelter.underground;

const withFloodStatus = (shelter: Shelter): Shelter => ({
  ...shelter,
  status: deriveFloodShelterStatus(shelter),
});

const fallbackShelters = () =>
  MOCK_SHELTERS.map((shelter) =>
    withFloodStatus({
      ...shelter,
      type: TEMPORARY_HOUSING_TYPE,
    }),
  ).filter(isFloodEvacuationCandidate);

const isValidShelter = (value: unknown): value is Shelter => {
  if (!value || typeof value !== "object") return false;
  const shelter = value as Partial<Shelter>;
  return (
    typeof shelter.id === "string" &&
    typeof shelter.name === "string" &&
    typeof shelter.address === "string" &&
    typeof shelter.capacity === "number" &&
    typeof shelter.underground === "boolean" &&
    typeof shelter.type === "string" &&
    (shelter.status === "OPERATING" ||
      shelter.status === "CHECK_REQUIRED" ||
      shelter.status === "EXCLUDED") &&
    typeof shelter.position?.lat === "number" &&
    Number.isFinite(shelter.position.lat) &&
    typeof shelter.position.lng === "number" &&
    Number.isFinite(shelter.position.lng)
  );
};

const fetchStaticShelters = async (origin: LatLng): Promise<Shelter[]> => {
  if (typeof window === "undefined" || typeof fetch !== "function") return [];

  const response = await fetch("/data/shelters.json");
  if (!response.ok) throw new Error(`Static shelter data failed: ${response.status}`);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return [];

  const ranked = payload
    .filter(isValidShelter)
    .map((shelter) => withFloodStatus(shelter))
    .filter(isFloodEvacuationCandidate)
    .map((shelter) => ({
      shelter,
      distanceMeters: haversineMeters(origin, shelter.position),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const nearby = ranked.filter(
    ({ distanceMeters }) => distanceMeters <= STATIC_SHELTER_RADIUS_METERS,
  );
  return (nearby.length > 0 ? nearby : ranked)
    .slice(0, STATIC_SHELTER_LIMIT)
    .map(({ shelter }) => shelter);
};

const fallbackSheltersForOrigin = async (origin: LatLng): Promise<Shelter[]> => {
  try {
    const staticShelters = await fetchStaticShelters(origin);
    if (staticShelters.length > 0) return staticShelters;
  } catch (error) {
    console.warn("Static shelter data unavailable. Falling back to demo data.", error);
  }

  if (haversineMeters(origin, DEMO_CENTER) <= DEMO_FALLBACK_RADIUS_METERS) {
    return fallbackShelters();
  }

  console.warn("No current-location shelter fallback is available outside the demo region.");
  return [];
};

export const fetchShelters = async (origin: LatLng): Promise<Shelter[]> => {
  try {
    // 반경 5km 대략적 bounding box 필터링 (1도 위도 = 약 111km)
    const latDelta = 5000 / 111320;
    const lngDelta = 5000 / (111320 * Math.cos(origin.lat * (Math.PI / 180)));

    const { data, error } = await supabase
      .from("shelter_operations")
      .select("*")
      .gte("lat", origin.lat - latDelta)
      .lte("lat", origin.lat + latDelta)
      .gte("lng", origin.lng - lngDelta)
      .lte("lng", origin.lng + lngDelta)
      // 최대 100개까지만 가져오도록 제한 (네트워크 최적화)
      .limit(100);

    if (error) throw error;

    if (data && data.length > 0) {
      const shelters = data
        .map((row) => {
          const shelter: Shelter = {
            id: row.id,
            name: row.name,
            address: row.address,
            position: { lat: row.lat, lng: row.lng },
            capacity: row.capacity,
            status: row.status as Shelter["status"],
            underground: row.underground ?? false,
            type: row.facility_type ?? TEMPORARY_HOUSING_TYPE,
          };

          return withFloodStatus(shelter);
        })
        .filter(isFloodEvacuationCandidate);

      if (shelters.length > 0) return shelters;
      console.warn(
        "Shelter DB returned no flood-safe temporary housing candidates. Falling back to static shelter data.",
      );
    }

    return await fallbackSheltersForOrigin(origin);
  } catch (err) {
    console.warn(
      "Exception querying shelter_operations table. Falling back to static shelter data.",
      err,
    );
  }

  return await fallbackSheltersForOrigin(origin);
};
