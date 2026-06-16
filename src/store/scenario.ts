import { create } from "zustand";
import type { ApiStatus } from "@/lib/api/types";
import {
  DEFAULT_SCENARIO_PRESET_ID,
  getScenarioPreset,
  type ScenarioPresetId,
} from "@/lib/scenario/presets";
import type { RiskLevel, LatLng, LocationStatus, RiskScoreBreakdown } from "@/lib/types";
import { DEMO_CENTER } from "@/mocks/data";
import { scoreToLevel } from "@/lib/risk";

interface ScenarioState {
  scenarioPresetId: ScenarioPresetId;
  riskLevel: RiskLevel;
  riskScore: number;
  apiStatus: ApiStatus;
  wmsStatus: ApiStatus;
  geminiStatus: ApiStatus;
  setScenarioPreset: (id: ScenarioPresetId) => void;
  setScenario: (level: RiskLevel) => void;
  setRiskScore: (score: number) => void;
  setRiskAssessment: (assessment: RiskScoreBreakdown) => void;

  origin: LatLng;
  setOrigin: (p: LatLng) => void;

  locationStatus: LocationStatus;
  setLocationStatus: (s: LocationStatus) => void;
}

const SCORE_BY_LEVEL: Record<RiskLevel, number> = {
  SAFE: 12,
  WATCH: 38,
  WARNING: 59,
  CRITICAL: 86,
  UNKNOWN: -1,
};

const defaultPreset = getScenarioPreset(DEFAULT_SCENARIO_PRESET_ID);

export const useScenario = create<ScenarioState>((set) => ({
  scenarioPresetId: defaultPreset.id,
  riskLevel: defaultPreset.riskLevel,
  riskScore: defaultPreset.riskScore,
  apiStatus: defaultPreset.apiStatus,
  wmsStatus: defaultPreset.wmsStatus,
  geminiStatus: defaultPreset.geminiStatus,
  setScenarioPreset: (id) => {
    const preset = getScenarioPreset(id);
    set({
      scenarioPresetId: preset.id,
      riskLevel: preset.riskLevel,
      riskScore: preset.riskScore,
      apiStatus: preset.apiStatus,
      wmsStatus: preset.wmsStatus,
      geminiStatus: preset.geminiStatus,
    });
  },
  setScenario: (level) => set({ riskLevel: level, riskScore: SCORE_BY_LEVEL[level] }),
  setRiskScore: (score) => set({ riskScore: score, riskLevel: scoreToLevel(score) }),
  setRiskAssessment: (assessment) =>
    set({ riskScore: assessment.total, riskLevel: assessment.level }),

  origin: DEMO_CENTER,
  setOrigin: (p) => set({ origin: p }),

  locationStatus: "PROMPT",
  setLocationStatus: (s) => set({ locationStatus: s }),
}));
