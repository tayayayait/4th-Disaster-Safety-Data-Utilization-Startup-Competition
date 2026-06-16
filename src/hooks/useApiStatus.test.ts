import { describe, expect, test } from "vitest";

import { summarizeApiStatus } from "./useApiStatus";
import type { ApiResult } from "@/lib/api/types";

const result = (status: ApiResult<unknown>["status"]): ApiResult<unknown> => ({
  data: {},
  status,
  timestamp: "2026-06-11T08:00:00.000Z",
  source: "unit",
});

describe("summarizeApiStatus", () => {
  test("prefers FAILED over FALLBACK, STALE, and OK", () => {
    expect(summarizeApiStatus([result("OK"), result("FAILED"), result("STALE")])).toBe("FAILED");
  });

  test("prefers FALLBACK over STALE and OK", () => {
    expect(summarizeApiStatus([result("OK"), result("STALE"), result("FALLBACK")])).toBe(
      "FALLBACK",
    );
  });

  test("returns OK when all results are OK", () => {
    expect(summarizeApiStatus([result("OK")])).toBe("OK");
  });
});
