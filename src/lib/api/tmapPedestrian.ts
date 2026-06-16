import { routesResponseSchema } from "./routeSchemas";
import type { RouteResult } from "@/lib/types";
import type { LatLngRouteRequest, RouteEdgeFetcher } from "./naverDirections";
import { supabase } from "@/integrations/supabase/client";

const invokeTmapPedestrianEdge: RouteEdgeFetcher = async (request) => {
  const { data, error } = await supabase.functions.invoke("tmap-pedestrian", {
    body: request,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const parseTmapPedestrianRoutes = (data: unknown): RouteResult[] =>
  routesResponseSchema.parse(data).routes;

export const fetchTmapPedestrianRoutes = async (
  request: LatLngRouteRequest,
  fetcher: RouteEdgeFetcher = invokeTmapPedestrianEdge,
): Promise<RouteResult[]> => parseTmapPedestrianRoutes(await fetcher(request));
