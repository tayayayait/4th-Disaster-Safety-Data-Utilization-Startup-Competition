import { handleCorsPreflight, jsonOk } from "../_shared/cors.ts";
import {
  assertAllowedMethod,
  parseJsonBody,
  validateGeminiPromptRequest,
} from "../_shared/validation.ts";
import { edgeError, fetchJson, requireEnv } from "../_shared/upstream.ts";
import {
  buildVertexAiGenerateContentUrl,
  getVertexAiAccessToken,
  getVertexAiAuthConfigFromEnv,
  getVertexAiConfigFromEnv,
  hasVertexAiConfig,
} from "../_shared/vertexAi.ts";

const SYSTEM = `당신은 재난 현장의 대피 전문가입니다.
사용자가 대피 중 실제로 바로 행동할 수 있는 구체적인 안내를 제공합니다.

[핵심 규칙]
1. "안전한 대안 경로입니다", "~를 종합 분석하여 안내됩니다" 같은 형식적이고 반복적인 문구는 절대 쓰지 마세요.
2. '경로 위험요인'에 포함된 구체적 통제 정보(발생 도로, 상황 유형, 통제 차로)를 콕 찝어서 정확히 언급하세요. (예: "00도로 1차로가 침수로 통제 중입니다. 이 구간을 우회하여...")
3. 각 reason은 "왜 → 그래서 뭘 해" 구조로 행동 지침을 포함하여 작성
4. 이모지(💡, ⚠️, 🏃)를 활용해 직관적으로 전달
5. 데이터가 부족하면 일반적인 재난 안전 꿀팁을 제공
6. JSON 키는 judgement, reasons, basis만 포함할 것

[좋은 예시]
입력: 위험도=WARNING, 침수흔적=20, 경로위험=강남대로 침수 2차로 통제
출력: {
  "judgement": "AVOID_ROUTE",
  "reasons": [
    "⚠️ 현재 강남대로 2차로가 침수로 인해 전면 통제 중입니다. 해당 구간을 피해 우회 경로로 이동하세요.",
    "💡 과거 침수 이력이 있는 지역을 지납니다. 물이 발목 이상 차오르기 전에 즉시 지대가 높은 곳으로 대피하세요.",
    "🏃 이동 중 지하차도나 하천변이 보이면 절대 진입하지 마시고 큰길(간선도로) 위주로 걸으세요."
  ],
  "basis": ["통제구간", "침수흔적", "경로위험"]
}`;

const buildPrompt = (
  input: ReturnType<typeof validateGeminiPromptRequest>,
) => `[분석 요청] 다음 제공된 실제 환경 데이터를 분석한 뒤, 사용자가 지금 당장 대피에 참고할 수 있는 실질적인 꿀팁과 행동 요령 3가지를 도출해주세요.

질문: ${input.question}
위험도: ${input.riskLevel}
추천 대피소: ${input.shelterName}
추천 대피소까지 거리(m): ${input.distanceMeters ?? "알 수 없음"}
추천 경로 ID: ${input.recommendedRouteId ?? "없음"}
추천 대피소 ID: ${input.recommendedShelterId ?? "없음"}
경로 위험요인: ${input.routeReasons.join(", ") || "없음"}
허용 고유명사: ${input.allowedProperNouns.join(", ") || input.shelterName}
데이터 기준: ${input.dataTimestamp}`;

const firstTextPart = (response: unknown) => {
  const candidate = (
    response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  ).candidates?.[0];
  const text = candidate?.content?.parts?.find((part) => typeof part.text === "string")?.text;
  if (!text) {
    console.error("[gemini-chat] Unexpected Gemini response:", JSON.stringify(response));
    return "{}";
  }
  return text;
};

const buildGenerateContentBody = (input: ReturnType<typeof validateGeminiPromptRequest>) => ({
  systemInstruction: { parts: [{ text: SYSTEM }] },
  contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        judgement: {
          type: "string",
          enum: [
            "WAIT",
            "WALK_TO_SHELTER",
            "DRIVE_TO_SAFE_ZONE",
            "AVOID_ROUTE",
            "CALL_119",
            "CHECK_OFFICIAL_NOTICE",
          ],
        },
        reasons: {
          type: "array",
          items: { type: "string" },
        },
        basis: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["judgement", "reasons", "basis"],
    },
  },
});

const fetchGeminiContent = async (input: ReturnType<typeof validateGeminiPromptRequest>) => {
  const body = buildGenerateContentBody(input);
  const getEnv = (name: string) => Deno.env.get(name);

  if (hasVertexAiConfig(getEnv)) {
    const vertexConfig = getVertexAiConfigFromEnv(getEnv);
    const accessToken = await getVertexAiAccessToken(getVertexAiAuthConfigFromEnv(getEnv));
    return fetchJson(
      buildVertexAiGenerateContentUrl(vertexConfig),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
      { timeoutMs: 20000, timeoutMessage: "Vertex AI request timed out" }
    );
  }

  const apiKey = requireEnv("GEMINI_API_KEY");
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash-preview:generateContent",
  );
  url.searchParams.set("key", apiKey);

  return fetchJson(
    url,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    { timeoutMs: 20000, timeoutMessage: "Gemini API request timed out" }
  );
};

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  try {
    assertAllowedMethod(request.method, ["POST"]);
    const input = validateGeminiPromptRequest(await parseJsonBody(request));
    const upstream = await fetchGeminiContent(input);

    const parsed = JSON.parse(firstTextPart(upstream)) as Record<string, unknown>;
    return jsonOk({
      ...parsed,
      timestamp: input.dataTimestamp,
      verified: true,
    });
  } catch (error) {
    return edgeError(error);
  }
});
