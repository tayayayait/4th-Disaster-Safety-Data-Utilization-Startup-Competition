export type RiskLevel = "SAFE" | "WATCH" | "WARNING" | "CRITICAL" | "UNKNOWN";
export type RouteMode = "WALK" | "DRIVE";
export type RouteStatus = "RECOMMENDED" | "ALTERNATIVE" | "REJECTED" | "LOADING" | "FAILED";
export type ShelterStatus = "OPERATING" | "CHECK_REQUIRED" | "EXCLUDED";
export type LocationStatus = "GRANTED" | "DENIED" | "PROMPT" | "ERROR";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Shelter {
  id: string;
  name: string;
  address: string;
  position: LatLng;
  capacity: number;
  status: ShelterStatus;
  underground: boolean;
  type: string;
}

export interface RiskZone {
  id: string;
  name: string;
  level: Exclude<RiskLevel, "UNKNOWN">;
  /** GeoJSON-like polygon: array of [lng, lat] */
  polygon: Array<[number, number]>;
  reasons: string[];
}

export interface TrafficEvent {
  id: string;
  type: string;
  eventType: string;
  eventDetailType?: string;
  position: LatLng;
  linkId?: string;
  roadName?: string;
  roadNo?: string;
  roadDirection?: string;
  lanesBlockType?: string;
  lanesBlocked?: string;
  message: string;
  startedAt?: string;
  endedAt?: string;
  source: string;
}

export interface RouteResult {
  id: string;
  mode: RouteMode;
  status: RouteStatus;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  safetyScore: number;
  riskReasons: string[];
  /** Polyline as [lat, lng] */
  geometry: LatLng[];
  shelterId: string;
}

export interface AiAnswer {
  judgement:
    | "WAIT"
    | "WALK_TO_SHELTER"
    | "DRIVE_TO_SAFE_ZONE"
    | "AVOID_ROUTE"
    | "CALL_119"
    | "CHECK_OFFICIAL_NOTICE";
  judgementLabel: string;
  reasons: string[];
  basis: string[];
  timestamp: string;
  verified: boolean;
}

export interface WeatherNow {
  rainfallMmPerHour: number;
  humidityPercent?: number;
  precipitationType?: string;
  alerts?: Array<{ level: "WATCH" | "WARNING" | "CRITICAL" }>;
}

export interface WeatherForecast {
  rainfallMmPerHour?: number;
  precipitationProbabilityPercent?: number;
  precipitationAmount?: string;
  alerts?: Array<{ level: "WATCH" | "WARNING" | "CRITICAL" }>;
}

export interface RiskCalculationInput {
  weather: WeatherNow | null;
  forecast: WeatherForecast | null;
  floodTrace: boolean;
  floodTraceOverlap?: number;
  riverFlood: boolean;
  riverFloodOverlap?: number;
  disasterMessages: Array<{
    region: string;
    body: string;
    issuedAt?: string;
    source?: string;
  }>;
  hasUnderpass: boolean;
  trafficControl: boolean;
  failedDataCount?: number;
  sensors?: Array<{
    id: string;
    type?: "WATER_LEVEL" | "RAINFALL" | "FLOOD_FORECAST";
    currentLevel?: number;
    flowRate?: number;
    attentionLevel?: number;
    warningLevel?: number;
    alarmLevel?: number;
    seriousLevel?: number;
    plannedFloodLevel?: number;
    currentRainfallMmPerHour?: number;
    riskLevel?: RiskLevel;
    forecastKind?: string;
    status: string;
  }>;
}

export interface RiskScoreBreakdown {
  weather: number;
  floodTrace: number;
  riverFlood: number;
  disasterMessages: number;
  underpass: number;
  trafficControl: number;
  total: number;
  level: RiskLevel;
  reasons: string[];
  missingDataCount: number;
}
