import { describe, expect, test } from "vitest";

import {
  isTrafficEventsUpstreamUnavailable,
  trafficEventsUnavailableBody,
} from "./upstreamFallback";

describe("traffic events upstream fallback", () => {
  test("classifies ITS eventInfo timeouts as upstream unavailable", () => {
    expect(isTrafficEventsUpstreamUnavailable(new Error("ITS eventInfo request timed out"))).toBe(
      true,
    );
  });

  test("does not classify invalid client input as upstream unavailable", () => {
    expect(isTrafficEventsUpstreamUnavailable(new Error("Invalid center"))).toBe(false);
  });

  test("returns an empty pending-access body for unavailable upstream data", () => {
    expect(trafficEventsUnavailableBody("ITS eventInfo request timed out")).toEqual({
      events: [],
      source: "ITS eventInfo",
      status: "PENDING_ACCESS",
      message: "ITS eventInfo request timed out",
    });
  });
});
