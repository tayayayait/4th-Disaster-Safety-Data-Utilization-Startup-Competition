import { describe, expect, test } from "vitest";

import {
  buildRuleBasedAiAnswer,
  GEMINI_CHAT_TIMEOUT_MS,
  type GeminiRouteExplanationInput,
} from "./gemini";

const baseInput: GeminiRouteExplanationInput = {
  question: "지금 나가도 되나요?",
  riskLevel: "WARNING",
  recommendedRouteId: "walk-1",
  recommendedShelterId: "s-01",
  shelterName: "역삼초등학교 체육관",
  routeReasons: ["침수 이력 구간 포함", "지하차도 통과"],
  dataTimestamp: "2026-06-11T08:00:00.000Z",
  allowedProperNouns: ["역삼초등학교 체육관", "침수", "지하차도"],
};

describe("buildRuleBasedAiAnswer", () => {
  test("keeps the Gemini timeout above observed deployed latency", () => {
    expect(GEMINI_CHAT_TIMEOUT_MS).toBeGreaterThanOrEqual(25_000);
  });

  test("returns question-specific fallback guidance for quick questions", () => {
    const leaveNow = buildRuleBasedAiAnswer({
      ...baseInput,
      question: "지금 나가도 되나요?",
    });
    const familyMessage = buildRuleBasedAiAnswer({
      ...baseInput,
      question: "가족에게 보낼 문구를 만들어주세요.",
    });
    const report = buildRuleBasedAiAnswer({
      ...baseInput,
      question: "담당자에게 신고할 내용을 정리해주세요.",
    });

    expect(leaveNow.reasons.join(" ")).toContain("지금 당장 이동");
    expect(familyMessage.judgementLabel).toBe("가족 공유 문구");
    expect(familyMessage.reasons.join(" ")).toContain("가족에게 공유");
    expect(report.judgementLabel).toBe("신고 내용 정리");
    expect(report.reasons.join(" ")).toContain("신고");
    expect(new Set([leaveNow.reasons[0], familyMessage.reasons[0], report.reasons[0]]).size).toBe(
      3,
    );
  });

  test("returns route-comparison fallback guidance for route explanation questions", () => {
    const answer = buildRuleBasedAiAnswer({
      ...baseInput,
      question: "추천 차량 경로인 NAVER 차량 경로가 선택된 이유를 설명해줘. 안전점수 82점.",
    });

    expect(answer.judgementLabel).toBe("안전 경로 안내");
    expect(answer.reasons.join(" ")).toContain("비교적 안전한 대안 경로");
    expect(answer.reasons.join(" ")).toContain("침수 이력 구간 포함");
    expect(answer.basis).toContain("경로상태");
  });
});
