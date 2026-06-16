import type { ApiStatus } from "@/lib/api/types";
import type { RiskLevel } from "@/lib/types";

export type ScenarioPresetId = "critical-flood";

export interface ScenarioPreset {
  id: ScenarioPresetId;
  label: string;
  description: string;
  riskLevel: RiskLevel;
  riskScore: number;
  apiStatus: ApiStatus;
  wmsStatus: ApiStatus;
  geminiStatus: ApiStatus;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "critical-flood",
    label: "재난 발생 (침수/범람)",
    description: "하천범람과 침수 위험이 발생한 즉시 대피 시나리오",
    riskLevel: "CRITICAL",
    riskScore: 86,
    apiStatus: "FALLBACK",
    wmsStatus: "OK",
    geminiStatus: "FALLBACK",
  },
];

export const DEFAULT_SCENARIO_PRESET_ID: ScenarioPresetId = "critical-flood";

export const getScenarioPreset = (id: ScenarioPresetId) =>
  SCENARIO_PRESETS.find((preset) => preset.id === id) ??
  SCENARIO_PRESETS.find((preset) => preset.id === DEFAULT_SCENARIO_PRESET_ID)!;
