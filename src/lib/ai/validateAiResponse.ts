import { z } from "zod";

import type { AiAnswer } from "@/lib/types";

export const ALLOWED_AI_ACTIONS = [
  "WAIT",
  "WALK_TO_SHELTER",
  "DRIVE_TO_SAFE_ZONE",
  "AVOID_ROUTE",
  "CALL_119",
  "CHECK_OFFICIAL_NOTICE",
] as const;

export const ACTION_LABEL: Record<(typeof ALLOWED_AI_ACTIONS)[number], string> = {
  WAIT: "현재 위치에서 대기",
  WALK_TO_SHELTER: "도보로 대피소 이동",
  DRIVE_TO_SAFE_ZONE: "차량으로 안전지대 이동",
  AVOID_ROUTE: "위험 경로 회피",
  CALL_119: "119 신고",
  CHECK_OFFICIAL_NOTICE: "공식 안내 확인",
};

const aiAnswerSchema = z.object({
  judgement: z.enum(ALLOWED_AI_ACTIONS),
  judgementLabel: z.string().optional(),
  reasons: z.array(z.string()).min(1),
  basis: z.array(z.string()).optional().default([]),
  timestamp: z.string().optional(),
  verified: z.boolean().optional(),
});

const PROPER_NOUN_PATTERN =
  /[가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|주민센터|구민회관|병원|대피소|지하차도)/g;
const COMMON_ALLOWED_TERMS = [
  "대피소",
  "지하차도",
  "안전",
  "경로",
  "위험",
  "침수",
  "범람",
  "통제",
  "대피",
  "이동",
];

const containsUnknownProperNoun = (text: string, allowedTerms: string[]) => {
  const matches = text.match(PROPER_NOUN_PATTERN) ?? [];
  const allowList = [...allowedTerms, ...COMMON_ALLOWED_TERMS];

  return matches.some((match) => {
    // match (예: "도원센트럴대피소") 가 allowList의 어떤 항목이라도 부분 일치하면 통과
    const isAllowed = allowList.some((term) => {
      // term이 match에 포함되거나 (예: "도원센트럴대피소".includes("대피소"))
      // match가 term에 포함되거나 (예: "힐스테이트 도원센트럴".includes("도원센트럴"))
      // 접미사를 제거한 핵심 명사가 포함되는지 확인
      const coreNoun = match.replace(
        /(초등학교|중학교|고등학교|주민센터|구민회관|병원|대피소|지하차도)$/,
        "",
      );
      return (
        term.includes(match) ||
        match.includes(term) ||
        (coreNoun.length > 0 && term.includes(coreNoun))
      );
    });
    return !isAllowed;
  });
};

export const validateAiResponse = ({
  data,
  fallback,
  timestamp,
  allowedTerms,
}: {
  data: unknown;
  fallback: AiAnswer;
  timestamp: string;
  allowedTerms: string[];
}): AiAnswer => {
  const parsed = aiAnswerSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("[AI Validation] Zod parsing failed:", parsed.error.issues, "Data:", data);
    return fallback;
  }

  const textForProperNounCheck = [
    parsed.data.judgementLabel ?? "",
    ...parsed.data.reasons,
    ...parsed.data.basis,
  ].join(" ");
  if (containsUnknownProperNoun(textForProperNounCheck, allowedTerms)) {
    console.warn("[AI Validation] Proper noun check failed for text:", textForProperNounCheck);
    return fallback;
  }

  return {
    judgement: parsed.data.judgement,
    judgementLabel: ACTION_LABEL[parsed.data.judgement],
    reasons: parsed.data.reasons,
    basis: parsed.data.basis,
    timestamp,
    verified: true,
  };
};
