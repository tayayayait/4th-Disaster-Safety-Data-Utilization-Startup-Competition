import { describe, expect, test } from "vitest";

import {
  fetchTrafficEventsWithRetry,
  isRetryableTrafficEventsUpstreamError,
} from "./upstreamRetry";

describe("traffic events upstream retry", () => {
  test("retries one timeout before returning the successful upstream response", async () => {
    let attempts = 0;

    const result = await fetchTrafficEventsWithRetry(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("ITS eventInfo request timed out");
      return { header: { resultCode: "0" }, body: { items: [] } };
    });

    expect(result).toEqual({ header: { resultCode: "0" }, body: { items: [] } });
    expect(attempts).toBe(2);
  });

  test("does not retry ITS API result-code errors", async () => {
    let attempts = 0;

    await expect(
      fetchTrafficEventsWithRetry(async () => {
        attempts += 1;
        throw new Error("ITS API error: 존재하지 않는 인증키입니다.");
      }),
    ).rejects.toThrow("ITS API error: 존재하지 않는 인증키입니다.");

    expect(attempts).toBe(1);
  });

  test("classifies timeout and upstream 5xx errors as retryable", () => {
    expect(
      isRetryableTrafficEventsUpstreamError(new Error("ITS eventInfo request timed out")),
    ).toBe(true);
    expect(isRetryableTrafficEventsUpstreamError(new Error("Upstream 503: unavailable"))).toBe(
      true,
    );
    expect(isRetryableTrafficEventsUpstreamError(new Error("Upstream 401: unauthorized"))).toBe(
      false,
    );
  });
});
