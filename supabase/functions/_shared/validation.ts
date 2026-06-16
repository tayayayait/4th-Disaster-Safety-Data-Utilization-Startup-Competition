export type RiskLevel = "SAFE" | "WATCH" | "WARNING" | "CRITICAL" | "UNKNOWN";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngRouteRequest {
  origin: LatLng;
  destination: LatLng;
}

export interface GeminiPromptRequest {
  question: string;
  riskLevel: RiskLevel;
  recommendedRouteId?: string;
  recommendedShelterId?: string;
  shelterName: string;
  distanceMeters?: number;
  routeReasons: string[];
  dataTimestamp: string;
  allowedProperNouns: string[];
}

const RISK_LEVELS = new Set<RiskLevel>(["SAFE", "WATCH", "WARNING", "CRITICAL", "UNKNOWN"]);

export const parseJsonBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
};

export const assertAllowedMethod = (method: string, allowed: string[]) => {
  if (!allowed.includes(method)) throw new Error("Method not allowed");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseBoundedText = (value: unknown, name: string, min: number, max: number) => {
  if (typeof value !== "string") throw new Error(`Invalid ${name}`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new Error(`Invalid ${name}`);
  return trimmed;
};

const validateLatLng = (value: unknown, name: string): LatLng => {
  if (!isRecord(value)) throw new Error(`Invalid ${name}`);
  const { lat, lng } = value;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`Invalid ${name}`);
  }
  if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error(`Invalid ${name}`);
  }
  return { lat, lng };
};

export const validateLatLngRequest = (value: unknown): LatLngRouteRequest => {
  if (!isRecord(value)) throw new Error("Invalid request body");
  return {
    origin: validateLatLng(value.origin, "origin"),
    destination: validateLatLng(value.destination, "destination"),
  };
};

export const validateGeminiPromptRequest = (value: unknown): GeminiPromptRequest => {
  if (!isRecord(value)) throw new Error("Invalid request body");

  const riskLevel = value.riskLevel;
  if (typeof riskLevel !== "string" || !RISK_LEVELS.has(riskLevel as RiskLevel)) {
    throw new Error("Invalid riskLevel");
  }

  const routeReasons = Array.isArray(value.routeReasons)
    ? value.routeReasons
        .filter((reason): reason is string => typeof reason === "string")
        .map((reason) => reason.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    question: parseBoundedText(value.question, "question", 1, 200),
    riskLevel: riskLevel as RiskLevel,
    recommendedRouteId:
      typeof value.recommendedRouteId === "string"
        ? parseBoundedText(value.recommendedRouteId, "recommendedRouteId", 1, 80)
        : undefined,
    recommendedShelterId:
      typeof value.recommendedShelterId === "string"
        ? parseBoundedText(value.recommendedShelterId, "recommendedShelterId", 1, 80)
        : undefined,
    shelterName: parseBoundedText(value.shelterName, "shelterName", 1, 80),
    distanceMeters: typeof value.distanceMeters === "number" ? value.distanceMeters : undefined,
    wmsFloodOverlap: typeof value.wmsFloodOverlap === "number" ? value.wmsFloodOverlap : undefined,
    wmsRiverOverlap: typeof value.wmsRiverOverlap === "number" ? value.wmsRiverOverlap : undefined,
    routeReasons,
    dataTimestamp: parseBoundedText(value.dataTimestamp, "dataTimestamp", 1, 80),
    allowedProperNouns: Array.isArray(value.allowedProperNouns)
      ? value.allowedProperNouns
          .filter((term): term is string => typeof term === "string")
          .map((term) => term.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [],
  };
};
