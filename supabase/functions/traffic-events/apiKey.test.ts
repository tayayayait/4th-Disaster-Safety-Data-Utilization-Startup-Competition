import { describe, expect, test } from "vitest";

import { readTrafficEventsApiKey, TRAFFIC_EVENTS_API_KEY_ENV } from "./apiKey";

describe("traffic events API key", () => {
  test("reads and trims the ITS API key from the environment", () => {
    expect(
      readTrafficEventsApiKey((name) =>
        name === TRAFFIC_EVENTS_API_KEY_ENV ? " abc123 " : undefined,
      ),
    ).toBe("abc123");
  });

  test("returns null when the ITS API key is missing or blank", () => {
    expect(readTrafficEventsApiKey(() => undefined)).toBeNull();
    expect(readTrafficEventsApiKey(() => "   ")).toBeNull();
  });
});
