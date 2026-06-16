import type { LatLng, RiskZone, RouteResult, TrafficEvent } from "@/lib/types";
import { haversineMeters } from "@/lib/utils";
import { classifyTrafficEvent, trafficEventReason } from "./trafficEventRisk";

const zonePenalty: Record<RiskZone["level"], number> = {
  SAFE: 0,
  WATCH: 12,
  WARNING: 28,
  CRITICAL: 80,
};

const TRAFFIC_EVENT_MATCH_RADIUS_M = 120;
const TRAFFIC_EVENT_BLOCKING_PENALTY = 45;
const TRAFFIC_EVENT_CAUTION_PENALTY = 18;

const toPoint = (point: LatLng) => [point.lng, point.lat] as const;

const orientation = (
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
) => {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-10) return 0;
  return value > 0 ? 1 : 2;
};

const onSegment = (
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
) =>
  b[0] <= Math.max(a[0], c[0]) &&
  b[0] >= Math.min(a[0], c[0]) &&
  b[1] <= Math.max(a[1], c[1]) &&
  b[1] >= Math.min(a[1], c[1]);

const segmentsIntersect = (
  a1: readonly [number, number],
  a2: readonly [number, number],
  b1: readonly [number, number],
  b2: readonly [number, number],
) => {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  return o4 === 0 && onSegment(b1, a2, b2);
};

const pointInPolygon = (point: readonly [number, number], polygon: Array<[number, number]>) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const routeIntersectsRiskZone = (route: RouteResult, zone: RiskZone) => {
  if (route.geometry.some((point) => pointInPolygon(toPoint(point), zone.polygon))) return true;

  const routeSegments = route.geometry
    .slice(1)
    .map((point, index) => [toPoint(route.geometry[index]), toPoint(point)] as const);
  const polygonSegments = zone.polygon.map(
    (point, index) => [point, zone.polygon[(index + 1) % zone.polygon.length]] as const,
  );

  return routeSegments.some(([routeStart, routeEnd]) =>
    polygonSegments.some(([zoneStart, zoneEnd]) =>
      segmentsIntersect(routeStart, routeEnd, zoneStart, zoneEnd),
    ),
  );
};

const routeRisk = (route: RouteResult, riskZones: RiskZone[]) => {
  const matchedZones = riskZones.filter((zone) => routeIntersectsRiskZone(route, zone));
  const penalty = matchedZones.reduce((sum, zone) => sum + zonePenalty[zone.level], 0);
  const rejected = matchedZones.some((zone) => zone.level === "CRITICAL");
  const reasons = matchedZones
    .flatMap((zone) => [zone.name, ...zone.reasons])
    .filter((reason, index, all) => all.indexOf(reason) === index)
    .slice(0, 3);
  return { penalty, rejected, reasons };
};

const toPlanarPoint = (point: LatLng, origin: LatLng) => {
  const latScale = 111_320;
  const lngScale = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (point.lng - origin.lng) * lngScale,
    y: (point.lat - origin.lat) * latScale,
  };
};

const distanceToSegmentMeters = (point: LatLng, start: LatLng, end: LatLng) => {
  if (start.lat === end.lat && start.lng === end.lng) return haversineMeters(point, start);

  const p = toPlanarPoint(point, start);
  const a = { x: 0, y: 0 };
  const b = toPlanarPoint(end, start);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const projection = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - projection.x, p.y - projection.y);
};

const distanceToRouteMeters = (event: TrafficEvent, route: RouteResult) => {
  if (route.geometry.length === 0) return Number.POSITIVE_INFINITY;
  if (route.geometry.length === 1) return haversineMeters(event.position, route.geometry[0]);

  return Math.min(
    ...route.geometry
      .slice(1)
      .map((point, index) => distanceToSegmentMeters(event.position, route.geometry[index], point)),
  );
};

const routeTrafficRisk = (route: RouteResult, trafficEvents: TrafficEvent[]) => {
  const matchedEvents = trafficEvents.filter(
    (event) =>
      classifyTrafficEvent(event) !== "INFO" &&
      distanceToRouteMeters(event, route) <= TRAFFIC_EVENT_MATCH_RADIUS_M,
  );
  const hasBlockingEvent = matchedEvents.some(
    (event) => classifyTrafficEvent(event) === "BLOCKING",
  );

  const reasons = matchedEvents
    .map(trafficEventReason)
    .filter((reason, index, all) => all.indexOf(reason) === index)
    .slice(0, 3);

  return {
    penalty:
      matchedEvents.length === 0
        ? 0
        : hasBlockingEvent
          ? TRAFFIC_EVENT_BLOCKING_PENALTY
          : TRAFFIC_EVENT_CAUTION_PENALTY,
    rejected: hasBlockingEvent,
    reasons,
  };
};

export const rankRoutesByRisk = (
  routes: RouteResult[],
  riskZones: RiskZone[],
  trafficEvents: TrafficEvent[] = [],
): RouteResult[] => {
  const ranked = routes.map((route) => {
    const risk = routeRisk(route, riskZones);
    const traffic = routeTrafficRisk(route, trafficEvents);
    const rejected = risk.rejected || traffic.rejected;
    return {
      ...route,
      status: rejected ? ("REJECTED" as const) : ("ALTERNATIVE" as const),
      safetyScore: Math.max(0, Math.min(100, route.safetyScore - risk.penalty - traffic.penalty)),
      riskReasons: [...traffic.reasons, ...risk.reasons, ...route.riskReasons]
        .filter((reason, index, all) => all.indexOf(reason) === index)
        .slice(0, 3),
    };
  });

  return ranked
    .sort((a, b) => {
      if (a.status === "REJECTED" && b.status !== "REJECTED") return 1;
      if (a.status !== "REJECTED" && b.status === "REJECTED") return -1;
      if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
      return a.distanceMeters - b.distanceMeters;
    })
    .map((route, index) =>
      route.status === "REJECTED"
        ? route
        : {
            ...route,
            status: index === 0 ? "RECOMMENDED" : "ALTERNATIVE",
          },
    );
};
