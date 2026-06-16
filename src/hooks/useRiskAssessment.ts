import { useEffect } from "react";

import { calculateRiskScore } from "@/lib/risk/calculateRiskScore";
import type { LatLng, RiskCalculationInput } from "@/lib/types";
import { useScenario } from "@/store/scenario";
import { useDisasterMessages } from "./useDisasterMessages";
import { useReverseGeocode } from "./useReverseGeocode";
import { useSensorFeeds } from "./useSensorFeeds";
import { useWeather } from "./useWeather";
import { useWmsOverlap } from "./useWmsOverlap";

export function useRiskAssessment(origin: LatLng) {
  const region = useReverseGeocode(origin);
  const { result: weatherResult } = useWeather({ origin });
  const { result: disasterResult } = useDisasterMessages({ region });
  const { floodTraceOverlap, riverFloodOverlap, safeMapEvidence } = useWmsOverlap(origin);
  const { feeds: sensors } = useSensorFeeds(origin);

  const countFailedApis = () => {
    let count = 0;
    if (weatherResult.status === "FAILED") count++;
    if (disasterResult.status === "FAILED" || disasterResult.status === "FALLBACK") count++;
    return count;
  };

  const input: RiskCalculationInput = {
    weather: weatherResult.data,
    forecast: weatherResult.data,
    floodTrace: floodTraceOverlap > 0,
    floodTraceOverlap,
    riverFlood: riverFloodOverlap > 0,
    riverFloodOverlap,
    disasterMessages: disasterResult.data ?? [],
    hasUnderpass: false,
    trafficControl: false,
    sensors,
    failedDataCount: countFailedApis(),
  };

  const breakdown = calculateRiskScore(input);
  const { setRiskAssessment } = useScenario();

  useEffect(() => {
    setRiskAssessment(breakdown);
  }, [breakdown.total, breakdown.level, setRiskAssessment]);

  return {
    ...breakdown,
    floodTraceOverlap,
    riverFloodOverlap,
    safeMapEvidence,
    region,
    weather: weatherResult.data,
  };
}
