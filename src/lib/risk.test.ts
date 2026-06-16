import { describe, expect, test } from "vitest";

import { riskClass, scoreToLevel } from "./risk";

describe("scoreToLevel", () => {
  test("maps risk score boundaries to the documented levels", () => {
    expect(scoreToLevel(-1)).toBe("UNKNOWN");
    expect(scoreToLevel(0)).toBe("SAFE");
    expect(scoreToLevel(24)).toBe("SAFE");
    expect(scoreToLevel(25)).toBe("WATCH");
    expect(scoreToLevel(49)).toBe("WATCH");
    expect(scoreToLevel(50)).toBe("WARNING");
    expect(scoreToLevel(74)).toBe("WARNING");
    expect(scoreToLevel(75)).toBe("CRITICAL");
    expect(scoreToLevel(100)).toBe("CRITICAL");
  });
});

describe("riskClass", () => {
  test("returns CSS token references for every risk state", () => {
    expect(riskClass("SAFE")).toEqual({
      bg: "var(--risk-safe-bg)",
      text: "var(--risk-safe-text)",
      overlay: "var(--risk-safe-overlay)",
    });
    expect(riskClass("UNKNOWN")).toEqual({
      bg: "var(--risk-unknown-bg)",
      text: "var(--risk-unknown-text)",
      overlay: "var(--risk-unknown-overlay)",
    });
  });
});
