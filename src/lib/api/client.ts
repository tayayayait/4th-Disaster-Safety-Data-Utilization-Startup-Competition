import { ZodError, type z } from "zod";

import type { ApiCache } from "./cache";
import type { ApiResult } from "./types";

interface RequestApiResultOptions<T> {
  key: string;
  source: string;
  schema: z.ZodType<T>;
  fetcher: () => Promise<unknown>;
  ttlMs: number;
  cache?: ApiCache;
  fallback?: T;
  now?: () => number;
}

const timestamp = (now: () => number) => new Date(now()).toISOString();

const errorMessage = (error: unknown) => {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join("; ");
  if (error instanceof Error) return error.message;
  return "Unknown API error";
};

export const requestApiResult = async <T>({
  key,
  source,
  schema,
  fetcher,
  ttlMs,
  cache,
  fallback,
  now = () => Date.now(),
}: RequestApiResultOptions<T>): Promise<ApiResult<T>> => {
  const cached = cache?.getFresh<T>(key);
  if (cached) return cached;

  try {
    const data = schema.parse(await fetcher());
    const result: ApiResult<T> = {
      data,
      status: "OK",
      timestamp: timestamp(now),
      source,
    };
    cache?.set(key, result, ttlMs);
    return result;
  } catch (error) {
    const message = errorMessage(error);
    const stale = cache?.getStale<T>(key);
    if (stale) {
      return {
        ...stale,
        status: "STALE",
        error: message,
      };
    }

    if (fallback !== undefined) {
      return {
        data: fallback,
        status: "FALLBACK",
        timestamp: timestamp(now),
        source,
        error: message,
      };
    }

    return {
      data: null,
      status: "FAILED",
      timestamp: timestamp(now),
      source,
      error: message,
    };
  }
};
