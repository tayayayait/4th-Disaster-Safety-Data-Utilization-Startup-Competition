import type { RiskLevel, RiskZone, Shelter } from "@/lib/types";
import { haversineMeters } from "@/lib/utils";

export interface AggregatedRiskZone {
  id: string;
  name: string;
  level: Exclude<RiskLevel, "UNKNOWN">;
  severityScore: number;
  affectedPeople: number;
  impactShelters: Shelter[];
  controlRoads: string[];
  reasons: string[];
}

const LEVEL_SCORE: Record<AggregatedRiskZone["level"], number> = {
  SAFE: 0,
  WATCH: 1,
  WARNING: 2,
  CRITICAL: 3,
};

const CONTROL_ROADS: Record<string, string[]> = {
  "rz-1": ["강남대로 저지대 구간", "테헤란로 강남역 접근로", "역삼로 배수 취약 구간"],
  "rz-2": ["영동대로 탄천 접근로", "대치동 하천변 도로", "삼성로 저지대 구간"],
  "rz-3": ["선릉로 선정릉 인근", "봉은사로 지하차도 접근로", "학동로 우회 연결로"],
};

const polygonCenter = (zone: RiskZone) => {
  const total = zone.polygon.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: total.lat / zone.polygon.length,
    lng: total.lng / zone.polygon.length,
  };
};

const impactedShelters = (zone: RiskZone, shelters: Shelter[]) => {
  const center = polygonCenter(zone);
  return shelters
    .map((shelter) => ({
      shelter,
      distance: haversineMeters(center, shelter.position),
    }))
    .filter(({ shelter, distance }) => shelter.status !== "EXCLUDED" && distance <= 2600)
    .sort((a, b) => a.distance - b.distance)
    .map(({ shelter }) => shelter)
    .slice(0, 4);
};

const virtualAffectedPeople = (zone: RiskZone, shelters: Shelter[]) => {
  const severityBase = LEVEL_SCORE[zone.level] * 900;
  const shelterCapacity = shelters.reduce((sum, shelter) => sum + shelter.capacity, 0);
  const reasonWeight = zone.reasons.length * 120;
  return Math.round((severityBase + shelterCapacity * 0.65 + reasonWeight) / 10) * 10;
};

export const aggregateRiskZones = (
  riskZones: RiskZone[],
  shelters: Shelter[],
  limit = 5,
): AggregatedRiskZone[] =>
  riskZones
    .map((zone) => {
      const impactShelters = impactedShelters(zone, shelters);
      return {
        id: zone.id,
        name: zone.name,
        level: zone.level,
        severityScore: LEVEL_SCORE[zone.level],
        affectedPeople: virtualAffectedPeople(zone, impactShelters),
        impactShelters,
        controlRoads: CONTROL_ROADS[zone.id] ?? [`${zone.name} 인접 도로`],
        reasons: zone.reasons.slice(0, 3),
      };
    })
    .sort((a, b) => {
      if (b.severityScore !== a.severityScore) return b.severityScore - a.severityScore;
      return b.affectedPeople - a.affectedPeople;
    })
    .slice(0, limit);
