import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { LatLng } from "@/lib/types";

const optionalCleanString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const cleaned = value.trim().replace(/;+$/g, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}, z.string().optional());

const cctvFeedSchema = z.object({
  id: z.string().min(1),
  roadSectionId: optionalCleanString,
  fileCreatedAt: optionalCleanString,
  cctvType: z.string().min(1),
  streamUrl: z.string().url(),
  resolution: optionalCleanString,
  position: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  format: z.string().min(1),
  name: z.string().min(1),
  source: z.string().min(1),
});

const cctvFeedsResponseSchema = z.object({
  cameras: z.array(cctvFeedSchema),
  source: z.string().optional(),
  status: z.enum(["OK", "PENDING_ACCESS"]).optional(),
});

export interface CctvFeedsRequest {
  center?: LatLng;
  radiusMeters?: number;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  limit?: number;
  roadType?: "all" | "ex" | "its";
  cctvType?: "1" | "2" | "3" | "4" | "5";
}

export type CctvFeed = z.infer<typeof cctvFeedSchema>;
export type CctvFeedsFetcher = (request: CctvFeedsRequest) => Promise<unknown>;

export const parseCctvFeeds = (data: unknown): CctvFeed[] =>
  cctvFeedsResponseSchema.parse(data).cameras;

const invokeCctvInfoEdge: CctvFeedsFetcher = async (request) => {
  const { data, error } = await supabase.functions.invoke("cctv-info", {
    body: request,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const fetchCctvFeeds = async (
  request: CctvFeedsRequest,
  fetcher: CctvFeedsFetcher = invokeCctvInfoEdge,
): Promise<CctvFeed[]> => parseCctvFeeds(await fetcher(request));
