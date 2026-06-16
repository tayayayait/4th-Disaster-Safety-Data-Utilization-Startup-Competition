export type HrfcoRiskLevel = "SAFE" | "WATCH" | "WARNING" | "CRITICAL" | "UNKNOWN";
export type HrfcoSensorType = "WATER_LEVEL" | "RAINFALL" | "FLOOD_FORECAST";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface HrfcoStation {
  wlobscd?: string;
  rfobscd?: string;
  obsnm?: string;
  agcnm?: string;
  addr?: string;
  etcaddr?: string;
  lon?: string;
  lat?: string;
  attwl?: unknown;
  wrnwl?: unknown;
  almwl?: unknown;
  srswl?: unknown;
  pfh?: unknown;
  fstnyn?: string;
}

export interface HrfcoWaterlevelReading {
  wlobscd?: string;
  ymdhm?: string;
  wl?: unknown;
  fw?: unknown;
}

export interface HrfcoRainfallReading {
  rfobscd?: string;
  ymdhm?: string;
  rf?: unknown;
}

export interface HrfcoFloodForecast {
  ancdt?: string;
  ancnm?: string;
  fctdt?: string;
  kind?: string;
  no?: string;
  obsnm?: string;
  rvrnm?: string;
  sttcurdt?: string;
  sttcurhgt?: unknown;
  sttcursealvl?: unknown;
  sttnm?: string;
  wrnaranm?: string;
}

export interface HrfcoWaterThresholds {
  attentionLevel?: number;
  warningLevel?: number;
  alarmLevel?: number;
  seriousLevel?: number;
}

export interface HrfcoSensorFeed {
  id: string;
  name: string;
  provider: string;
  region: string;
  status: "DISABLED" | "PENDING_ACCESS" | "ACTIVE" | "FAILED";
  source: string;
  lastObservedAt: string | null;
  type: HrfcoSensorType;
  position?: LatLng;
  currentLevel?: number;
  flowRate?: number;
  attentionLevel?: number;
  warningLevel?: number;
  alarmLevel?: number;
  seriousLevel?: number;
  plannedFloodLevel?: number;
  currentRainfallMmPerHour?: number;
  riskLevel?: HrfcoRiskLevel;
  forecastKind?: string;
  message?: string;
}

export const parseHrfcoNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const hrfcoDmsToDecimal = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parts = value
    .trim()
    .split("-")
    .map((part) => Number(part.trim()));
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return null;

  const degrees = parts[0];
  const minutes = parts[1] ?? 0;
  const seconds = parts[2] ?? 0;
  const sign = degrees < 0 ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
};

export const hrfcoStationPosition = (station: HrfcoStation): LatLng | null => {
  const lat = hrfcoDmsToDecimal(station.lat);
  const lng = hrfcoDmsToDecimal(station.lon);
  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

export const hrfcoDistanceMeters = (a: LatLng, b: LatLng) => {
  const earthRadiusMeters = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const selectNearestHrfcoStation = <T extends HrfcoStation>(
  origin: LatLng,
  stations: T[],
): T | null => {
  let nearest: T | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const station of stations) {
    const position = hrfcoStationPosition(station);
    if (!position) continue;
    const distance = hrfcoDistanceMeters(origin, position);
    if (distance < nearestDistance) {
      nearest = station;
      nearestDistance = distance;
    }
  }

  return nearest;
};

export const parseHrfcoTimestamp = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (/^\d{12}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:00+09:00`;
  }
  if (/^\d{10}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:00:00+09:00`;
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00+09:00`;
  }
  return null;
};

export const mapHrfcoWaterRiskLevel = (
  currentLevel: number | undefined,
  thresholds: HrfcoWaterThresholds,
): HrfcoRiskLevel => {
  if (currentLevel == null) return "UNKNOWN";
  if (thresholds.seriousLevel != null && currentLevel >= thresholds.seriousLevel) {
    return "CRITICAL";
  }
  if (thresholds.alarmLevel != null && currentLevel >= thresholds.alarmLevel) {
    return "CRITICAL";
  }
  if (thresholds.warningLevel != null && currentLevel >= thresholds.warningLevel) {
    return "WARNING";
  }
  if (thresholds.attentionLevel != null && currentLevel >= thresholds.attentionLevel) {
    return "WATCH";
  }
  return "SAFE";
};

export const mapHrfcoRainfallRiskLevel = (
  rainfallMmPerHour: number | undefined,
): HrfcoRiskLevel => {
  if (rainfallMmPerHour == null) return "UNKNOWN";
  if (rainfallMmPerHour >= 50) return "CRITICAL";
  if (rainfallMmPerHour >= 30) return "WARNING";
  if (rainfallMmPerHour >= 15) return "WATCH";
  return "SAFE";
};

export const mapFloodForecastRiskLevel = (kind: unknown): HrfcoRiskLevel => {
  if (typeof kind !== "string" || !kind.trim()) return "UNKNOWN";
  if (kind.includes("경보")) return "CRITICAL";
  if (kind.includes("주의보")) return "WARNING";
  return "WATCH";
};

const stationRegion = (station: HrfcoStation) =>
  [station.addr, station.etcaddr]
    .filter((value) => value && value.trim())
    .join(" ")
    .trim() || "전국";

export const buildWaterlevelSensorFeed = (
  station: HrfcoStation,
  reading: HrfcoWaterlevelReading,
): HrfcoSensorFeed => {
  const code = station.wlobscd ?? reading.wlobscd ?? "unknown";
  const currentLevel = parseHrfcoNumber(reading.wl);
  const thresholds = {
    attentionLevel: parseHrfcoNumber(station.attwl),
    warningLevel: parseHrfcoNumber(station.wrnwl),
    alarmLevel: parseHrfcoNumber(station.almwl),
    seriousLevel: parseHrfcoNumber(station.srswl),
  };

  return {
    id: `hrfco-waterlevel-${code}`,
    name: station.obsnm ? `${station.obsnm} 수위` : `${code} 수위`,
    provider: station.agcnm?.trim() || "기후에너지환경부 한강홍수통제소",
    region: stationRegion(station),
    status: currentLevel == null ? "FAILED" : "ACTIVE",
    source: "HRFCO waterlevel",
    lastObservedAt: parseHrfcoTimestamp(reading.ymdhm),
    type: "WATER_LEVEL",
    position: hrfcoStationPosition(station) ?? undefined,
    currentLevel,
    flowRate: parseHrfcoNumber(reading.fw),
    ...thresholds,
    plannedFloodLevel: parseHrfcoNumber(station.pfh),
    riskLevel: mapHrfcoWaterRiskLevel(currentLevel, thresholds),
  };
};

export const buildRainfallSensorFeed = (
  station: HrfcoStation,
  reading: HrfcoRainfallReading,
  timeType: "1H" | "10M" = "1H",
): HrfcoSensorFeed => {
  const code = station.rfobscd ?? reading.rfobscd ?? "unknown";
  const rainfall = parseHrfcoNumber(reading.rf);
  const rainfallMmPerHour =
    rainfall == null ? undefined : timeType === "10M" ? rainfall * 6 : rainfall;

  return {
    id: `hrfco-rainfall-${code}`,
    name: station.obsnm ? `${station.obsnm} 강수량` : `${code} 강수량`,
    provider: station.agcnm?.trim() || "기후에너지환경부 한강홍수통제소",
    region: stationRegion(station),
    status: rainfallMmPerHour == null ? "FAILED" : "ACTIVE",
    source: "HRFCO rainfall",
    lastObservedAt: parseHrfcoTimestamp(reading.ymdhm),
    type: "RAINFALL",
    position: hrfcoStationPosition(station) ?? undefined,
    currentRainfallMmPerHour: rainfallMmPerHour,
    riskLevel: mapHrfcoRainfallRiskLevel(rainfallMmPerHour),
  };
};

export const buildFloodForecastSensorFeeds = (forecasts: HrfcoFloodForecast[]): HrfcoSensorFeed[] =>
  forecasts.map((forecast, index) => {
    const stationCode = forecast.sttnm?.trim() || `unknown-${index}`;
    const announcedAtRaw = forecast.ancdt?.trim() || String(index);
    const riskLevel = mapFloodForecastRiskLevel(forecast.kind);
    const region = forecast.wrnaranm?.trim() || forecast.rvrnm?.trim() || "전국";
    const name = forecast.obsnm?.trim()
      ? `${forecast.obsnm.trim()} 홍수예보`
      : `${stationCode} 홍수예보`;

    return {
      id: `hrfco-fldfct-${stationCode}-${announcedAtRaw}`,
      name,
      provider: forecast.ancnm?.trim() || "기후에너지환경부 한강홍수통제소",
      region,
      status: riskLevel === "UNKNOWN" ? "FAILED" : "ACTIVE",
      source: "HRFCO fldfct",
      lastObservedAt: parseHrfcoTimestamp(forecast.ancdt),
      type: "FLOOD_FORECAST",
      currentLevel: parseHrfcoNumber(forecast.sttcurhgt),
      riskLevel,
      forecastKind: forecast.kind?.trim(),
      message: [forecast.kind, forecast.rvrnm, forecast.obsnm, forecast.wrnaranm]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" "),
    };
  });
