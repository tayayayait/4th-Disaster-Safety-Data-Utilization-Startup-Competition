import { useQuery } from "@tanstack/react-query";

import { API_CACHE_TTL_MS } from "@/lib/api/cache";
import { parseDisasterMessages } from "@/lib/api/disasterMsg";
import type { ApiResult, DisasterMessage } from "@/lib/api/types";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_MESSAGES: DisasterMessage[] = [
  {
    id: "demo-msg-gangnam-rain",
    region: "서울 강남구",
    body: "강남역 일대 저지대 침수 위험. 하천변과 지하차도 접근을 피하세요.",
    issuedAt: "2026-06-11T14:30:00+09:00",
    source: "demo",
  },
];

export const createDisasterMessagesFallbackResult = (
  now: () => number = () => Date.now(),
  options: { error?: string } = {},
): ApiResult<DisasterMessage[]> => ({
  data: FALLBACK_MESSAGES,
  status: "FALLBACK",
  timestamp: new Date(now()).toISOString(),
  source: "demo-disaster-messages",
  error: options.error,
});

export interface DisasterMessagesRequest {
  region?: string;
  startDate?: string;
  pageNo?: number;
  numOfRows?: number;
}

export type DisasterMessagesFetcher = (request: DisasterMessagesRequest) => Promise<unknown>;

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDisasterMessageStartDate = (date = new Date()) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

const invokeDisasterMessagesEdge: DisasterMessagesFetcher = async (request) => {
  const { data, error } = await supabase.functions.invoke("disaster-messages", {
    body: {
      rgnNm: request.region,
      crtDt: request.startDate,
      pageNo: request.pageNo ?? 1,
      numOfRows: request.numOfRows ?? 20,
    },
  });
  if (error) throw new Error(error.message);
  return data;
};

export const fetchDisasterMessages = async (
  request: DisasterMessagesRequest,
  fetcher: DisasterMessagesFetcher = invokeDisasterMessagesEdge,
): Promise<DisasterMessage[]> => parseDisasterMessages(await fetcher(request));

export const useDisasterMessages = ({
  region = "서울 강남구",
  startDate = formatDisasterMessageStartDate(),
  pageNo = 1,
  numOfRows = 20,
  client,
}: DisasterMessagesRequest & { client?: DisasterMessagesFetcher } = {}) => {
  const query = useQuery({
    queryKey: ["disaster-messages", region, startDate, pageNo, numOfRows],
    staleTime: API_CACHE_TTL_MS.DISASTER_MESSAGES,
    queryFn: async (): Promise<ApiResult<DisasterMessage[]>> => {
      const data = await fetchDisasterMessages({ region, startDate, pageNo, numOfRows }, client);
      return {
        data,
        status: "OK",
        timestamp: new Date().toISOString(),
        source: "MOIS-DSSP-IF-00247",
      };
    },
    retry: client ? false : 2,
    retryDelay: 1000,
  });

  return {
    result:
      query.data ??
      createDisasterMessagesFallbackResult(() => 0, {
        error: query.isError
          ? query.error instanceof Error
            ? query.error.message
            : "Disaster messages API failed"
          : "Disaster messages request is loading",
      }),
    isLoading: query.isLoading,
  };
};
