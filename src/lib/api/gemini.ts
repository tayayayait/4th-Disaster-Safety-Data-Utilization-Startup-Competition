import { z } from "zod";

import { ACTION_LABEL, ALLOWED_AI_ACTIONS, validateAiResponse } from "@/lib/ai/validateAiResponse";
import type { AiAnswer, RiskLevel } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

export interface GeminiRouteExplanationInput {
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

type AiAction = (typeof ALLOWED_AI_ACTIONS)[number];

export type GeminiChatClient = (input: GeminiRouteExplanationInput) => Promise<unknown>;

export const GEMINI_CHAT_TIMEOUT_MS = 25_000;

export const AI_NOTICE =
  "AI 안내는 공공데이터와 현재 입력값을 기반으로 한 보조 판단입니다. 지자체 대피명령과 현장 통제를 우선하세요.";

const hasFloodRiskReason = (reason: string) =>
  reason.includes("지하차도") ||
  reason.includes("침수") ||
  reason.includes("범람") ||
  reason.includes("통제");

const ruleJudgement = (riskLevel: RiskLevel, routeReasons: string[]): AiAction => {
  if (riskLevel === "CRITICAL") return "WALK_TO_SHELTER";
  if (routeReasons.some(hasFloodRiskReason)) return "AVOID_ROUTE";
  if (riskLevel === "WARNING") return "WALK_TO_SHELTER";
  if (riskLevel === "WATCH") return "CHECK_OFFICIAL_NOTICE";
  return "WAIT";
};

export const buildRuleBasedAiAnswer = (input: GeminiRouteExplanationInput): AiAnswer => {
  const judgement = ruleJudgement(input.riskLevel, input.routeReasons);
  const question = input.question.replace(/\s+/g, " ");
  const routeReasons = input.routeReasons.length > 0 ? input.routeReasons : ["수집된 위험 근거 없음"];

  if (question.includes("가족")) {
    return {
      judgement,
      judgementLabel: "가족 공유 문구",
      reasons: [
        `${input.shelterName} 방향으로 이동 중입니다. 가족에게 공유할 위치와 이동 상태를 짧게 전달하세요.`,
        ...routeReasons,
      ],
      basis: ["질문유형", "경로근거"],
      timestamp: input.dataTimestamp,
      verified: false,
    };
  }

  if (question.includes("신고") || question.includes("119")) {
    return {
      judgement: "CALL_119",
      judgementLabel: "신고 내용 정리",
      reasons: [
        `${input.shelterName} 주변 위험 상황, 현재 위치, 통제 여부를 신고 내용에 포함하세요.`,
        ...routeReasons,
      ],
      basis: ["질문유형", "경로근거"],
      timestamp: input.dataTimestamp,
      verified: false,
    };
  }

  if (
    question.includes("추천") ||
    question.includes("경로") ||
    question.includes("안전점수")
  ) {
    return {
      judgement,
      judgementLabel: "안전 경로 안내",
      reasons: [
        `${input.shelterName}까지 비교적 안전한 대안 경로를 우선 확인하세요.`,
        ...routeReasons,
      ],
      basis: ["경로상태", "위험근거"],
      timestamp: input.dataTimestamp,
      verified: false,
    };
  }

  if (question.includes("지금") || question.includes("이동") || question.includes("나가")) {
    return {
      judgement,
      judgementLabel: ACTION_LABEL[judgement],
      reasons: [
        `지금 당장 이동 여부는 ${input.shelterName}까지의 경로 위험 근거를 확인한 뒤 판단하세요.`,
        ...routeReasons,
      ],
      basis: ["질문유형", "경로근거"],
      timestamp: input.dataTimestamp,
      verified: false,
    };
  }

  return {
    judgement,
    judgementLabel: ACTION_LABEL[judgement],
    reasons: ["AI 통신 지연으로 맞춤형 안내를 제공할 수 없습니다."],
    basis: ["통신지연"],
    timestamp: input.dataTimestamp,
    verified: false,
  };
};

export const shouldCallGemini = (input: GeminiRouteExplanationInput) =>
  Boolean(
    input.recommendedRouteId &&
    input.recommendedShelterId &&
    input.riskLevel &&
    input.dataTimestamp,
  );

const invokeGeminiChatEdge: GeminiChatClient = async (input) => {
  const { data, error } = await supabase.functions.invoke("gemini-chat", {
    body: input,
  });
  if (error) throw new Error(error.message);
  return data;
};

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      globalThis.setTimeout(() => reject(new Error("Gemini timeout")), ms);
    }),
  ]);

export const explainRouteWithGemini = async (
  input: GeminiRouteExplanationInput,
  client: GeminiChatClient = invokeGeminiChatEdge,
): Promise<AiAnswer> => {
  const fallback = buildRuleBasedAiAnswer(input);
  if (!shouldCallGemini(input)) return fallback;

  try {
    const data = await withTimeout(client(input), GEMINI_CHAT_TIMEOUT_MS);
    const validated = validateAiResponse({
      data,
      fallback,
      timestamp: input.dataTimestamp,
      allowedTerms: input.allowedProperNouns,
    });
    if (!validated.verified) {
      console.warn("AI response validation failed, falling back to rule-based.", { data });
    }
    return validated;
  } catch (error) {
    console.error("Gemini AI failed:", error);
    return fallback;
  }
};
