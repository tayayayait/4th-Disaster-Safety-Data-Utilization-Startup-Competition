import { useMemo } from "react";

import type { ApiResult, ApiStatus } from "@/lib/api/types";

const STATUS_PRIORITY: ApiStatus[] = ["FAILED", "FALLBACK", "STALE", "OK"];

export interface ApiHealthStatus {
  name: string;
  status: ApiStatus;
  lastSuccess: string;
  lastError?: string;
  responseTime?: number;
}

export const API_STATUS_META: Record<
  ApiStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  OK: { label: "정상", bg: "#dcfce7", text: "#166534", border: "#86efac" },
  STALE: { label: "지연", bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
  FAILED: { label: "실패", bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  FALLBACK: { label: "대체", bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
};

export const summarizeApiStatus = (results: Array<ApiResult<unknown> | null | undefined>) => {
  const statuses = new Set(
    results
      .filter((result): result is ApiResult<unknown> => result != null)
      .map((result) => result.status),
  );
  return STATUS_PRIORITY.find((status) => statuses.has(status)) ?? "OK";
};

export const useApiStatus = (results: Array<ApiResult<unknown> | null | undefined>) =>
  useMemo(() => summarizeApiStatus(results), [results]);

export const summarizeApiHealth = (items: ApiHealthStatus[]) => ({
  total: items.length,
  ok: items.filter((item) => item.status === "OK").length,
  degraded: items.filter((item) => item.status === "STALE" || item.status === "FALLBACK").length,
  failed: items.filter((item) => item.status === "FAILED").length,
  worst: STATUS_PRIORITY.find((status) => items.some((item) => item.status === status)) ?? "OK",
});
