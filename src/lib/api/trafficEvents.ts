import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { LatLng, TrafficEvent } from "@/lib/types";

const trafficEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  eventType: z.string().min(1),
  eventDetailType: z.string().optional(),
  position: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  linkId: z.string().optional(),
  roadName: z.string().optional(),
  roadNo: z.string().optional(),
  roadDirection: z.string().optional(),
  lanesBlockType: z.string().optional(),
  lanesBlocked: z.string().optional(),
  message: z.string(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  source: z.string().min(1),
});

const trafficEventsResponseSchema = z.object({
  events: z.array(trafficEventSchema),
  source: z.string().optional(),
  status: z.enum(["OK", "PENDING_ACCESS"]).optional(),
  message: z.string().optional(),
});

export interface TrafficEventsRequest {
  center: LatLng;
  radiusMeters?: number;
}

export type TrafficEventsFetcher = (request: TrafficEventsRequest) => Promise<unknown>;
export type TrafficEventsResponse = z.infer<typeof trafficEventsResponseSchema>;

export const parseTrafficEvents = (data: unknown): TrafficEvent[] =>
  trafficEventsResponseSchema.parse(data).events;

export const parseTrafficEventsResponse = (data: unknown): TrafficEventsResponse => {
  const parsed = trafficEventsResponseSchema.parse(data);
  return {
    ...parsed,
    status: parsed.status ?? "OK",
  };
};

const invokeTrafficEventsEdge: TrafficEventsFetcher = async (request) => {
  const { data, error } = await supabase.functions.invoke("traffic-events", {
    body: request,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const fetchTrafficEvents = async (
  request: TrafficEventsRequest,
  fetcher: TrafficEventsFetcher = invokeTrafficEventsEdge,
): Promise<TrafficEventsResponse> => parseTrafficEventsResponse(await fetcher(request));
