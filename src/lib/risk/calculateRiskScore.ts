import { scoreToLevel } from "@/lib/risk";
import type { RiskCalculationInput, RiskScoreBreakdown } from "@/lib/types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const parsePrecipitationAmount = (value?: string) => {
  if (!value || value === "강수없음") return 0;
  if (value.includes("30.0~50.0")) return 40;
  if (value.includes("50.0")) return 50;
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const sensorRainfallMmPerHour = (input: Pick<RiskCalculationInput, "sensors">) => {
  const values = (input.sensors ?? [])
    .filter((sensor) => sensor.status === "ACTIVE")
    .map((sensor) => sensor.currentRainfallMmPerHour ?? 0);
  return Math.max(0, ...values);
};

const weatherRiskScore = ({
  weather,
  forecast,
  sensors,
}: Pick<RiskCalculationInput, "weather" | "forecast" | "sensors">) => {
  const currentRain = weather?.rainfallMmPerHour ?? 0;
  const forecastRain =
    forecast?.rainfallMmPerHour ?? parsePrecipitationAmount(forecast?.precipitationAmount);
  const hrfcoRain = sensorRainfallMmPerHour({ sensors });
  const alertLevel = [...(weather?.alerts ?? []), ...(forecast?.alerts ?? [])].some(
    (alert) => alert.level === "CRITICAL" || alert.level === "WARNING",
  );

  const rainLimitMmPerHour = 30;
  const maxRain = Math.max(currentRain, forecastRain, hrfcoRain);
  const rainScore = Math.min(30, Math.round(30 * (maxRain / rainLimitMmPerHour)));

  return clamp(Math.max(rainScore, alertLevel ? 24 : 0), 0, 30);
};

const disasterMessageScore = (input: RiskCalculationInput) => {
  const relevant = input.disasterMessages.some((message) =>
    includesAny(`${message.region} ${message.body}`, [
      "강남",
      "침수",
      "대피",
      "통제",
      "하천",
      "호우",
    ]),
  );
  return relevant ? 15 : 0;
};

const riskLevelScore = (riskLevel?: string) => {
  switch (riskLevel) {
    case "CRITICAL":
      return 80;
    case "WARNING":
      return 55;
    case "WATCH":
      return 30;
    default:
      return 0;
  }
};

const waterThresholdScore = (sensor: NonNullable<RiskCalculationInput["sensors"]>[number]) => {
  if (sensor.currentLevel == null) return 0;
  if (sensor.seriousLevel != null && sensor.currentLevel >= sensor.seriousLevel) return 80;
  if (sensor.alarmLevel != null && sensor.currentLevel >= sensor.alarmLevel) return 80;
  if (sensor.warningLevel != null && sensor.currentLevel >= sensor.warningLevel) return 55;
  if (sensor.attentionLevel != null && sensor.currentLevel >= sensor.attentionLevel) return 30;
  if (sensor.warningLevel != null && sensor.currentLevel >= sensor.warningLevel * 0.8) return 15;
  return 0;
};

const sensorRiskScore = (input: RiskCalculationInput) => {
  if (!input.sensors || input.sensors.length === 0) return 0;

  let maxScore = 0;
  for (const sensor of input.sensors) {
    if (sensor.status !== "ACTIVE" || sensor.type === "RAINFALL") continue;
    maxScore = Math.max(maxScore, riskLevelScore(sensor.riskLevel), waterThresholdScore(sensor));
  }
  return maxScore;
};

const hasActiveSensor = (input: RiskCalculationInput) =>
  (input.sensors ?? []).some((sensor) => sensor.status === "ACTIVE");

export const calculateRiskScore = (input: RiskCalculationInput): RiskScoreBreakdown => {
  const missingDataCount =
    (input.weather ? 0 : 1) + (input.forecast ? 0 : 1) + (input.failedDataCount ?? 0);

  if (missingDataCount >= 2 && !hasActiveSensor(input)) {
    return {
      weather: 0,
      floodTrace: 0,
      riverFlood: 0,
      disasterMessages: 0,
      underpass: 0,
      trafficControl: 0,
      total: -1,
      level: "UNKNOWN",
      reasons: ["필수 데이터 2개 이상 실패"],
      missingDataCount,
    };
  }

  const weather = weatherRiskScore(input);

  const traceOverlapRatio = input.floodTraceOverlap ?? (input.floodTrace ? 1 : 0);
  const floodTrace = Math.min(25, Math.round(25 * traceOverlapRatio));

  const sensor = sensorRiskScore(input);
  const riverOverlapRatio = input.riverFloodOverlap ?? (input.riverFlood ? 1 : 0);
  const riverBase = Math.min(20, Math.round(20 * riverOverlapRatio));
  const riverFlood = Math.max(riverBase, sensor);

  const disasterMessages = disasterMessageScore(input);
  const underpass = input.hasUnderpass ? 5 : 0;
  const trafficControl = input.trafficControl ? 5 : 0;

  const total = clamp(
    weather + floodTrace + riverFlood + disasterMessages + underpass + trafficControl,
    0,
    100,
  );

  const reasons = [
    weather > 0 ? "강우·예보 위험" : "",
    floodTrace > 0 ? "침수흔적 중첩" : "",
    riverFlood > 0
      ? sensor >= 80
        ? "실시간 수위·홍수예보 위험"
        : sensor >= 30
          ? "실시간 수위·강우 위험"
          : "하천범람 위험"
      : "",
    disasterMessages > 0 ? "재난문자 위험지역" : "",
    underpass > 0 ? "지하차도·저지대 통과" : "",
    trafficControl > 0 ? "교통통제·돌발" : "",
  ].filter(Boolean);

  return {
    weather,
    floodTrace,
    riverFlood,
    disasterMessages,
    underpass,
    trafficControl,
    total,
    level: scoreToLevel(total),
    reasons,
    missingDataCount,
  };
};
