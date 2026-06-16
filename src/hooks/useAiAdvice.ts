import { useQuery } from "@tanstack/react-query";
import { explainRouteWithGemini, type GeminiRouteExplanationInput } from "@/lib/api/gemini";

export function useAiAdvice(input: GeminiRouteExplanationInput | null) {
  return useQuery({
    queryKey: [
      "ai-advice",
      input?.riskLevel,
      input?.recommendedShelterId,
      input?.recommendedRouteId,
    ],
    queryFn: async () => {
      if (!input) return null;
      return explainRouteWithGemini(input);
    },
    enabled: Boolean(input),
    staleTime: 60 * 1000, // 1분 캐싱
  });
}
