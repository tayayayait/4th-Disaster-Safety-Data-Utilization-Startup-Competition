import { z } from "zod";

export const latLngSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const routeResultSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(["WALK", "DRIVE"]),
  status: z.enum(["RECOMMENDED", "ALTERNATIVE", "REJECTED", "LOADING", "FAILED"]),
  name: z.string().min(1),
  distanceMeters: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  safetyScore: z.number().min(0).max(100),
  riskReasons: z.array(z.string()),
  geometry: z.array(latLngSchema).min(1),
  shelterId: z.string().min(1),
});

export const routesResponseSchema = z.object({
  routes: z.array(routeResultSchema),
});

export const routeResultsSchema = z.array(routeResultSchema);
