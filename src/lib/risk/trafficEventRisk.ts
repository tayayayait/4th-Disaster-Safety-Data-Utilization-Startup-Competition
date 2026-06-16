import type { TrafficEvent } from "@/lib/types";

export type TrafficEventSeverity = "BLOCKING" | "CAUTION" | "INFO";

const BLOCKING_KEYWORDS = ["침수", "통제", "차단", "재난", "호우", "홍수", "수위", "유실"];
const CAUTION_KEYWORDS = ["사고", "공사", "기상", "돌발", "정체", "서행"];

const trafficEventText = (event: TrafficEvent) =>
  [event.eventType, event.eventDetailType, event.lanesBlockType, event.lanesBlocked, event.message]
    .filter(Boolean)
    .join(" ");

export const classifyTrafficEvent = (event: TrafficEvent): TrafficEventSeverity => {
  const target = trafficEventText(event);
  if (BLOCKING_KEYWORDS.some((keyword) => target.includes(keyword))) return "BLOCKING";
  if (CAUTION_KEYWORDS.some((keyword) => target.includes(keyword))) return "CAUTION";
  return "INFO";
};

export const trafficEventReason = (event: TrafficEvent) => {
  const road = event.roadName ? `${event.roadName} ` : "";
  const detail = event.eventDetailType || event.eventType;
  return `${road}${detail || "돌발상황"} ${event.message}`.trim();
};
