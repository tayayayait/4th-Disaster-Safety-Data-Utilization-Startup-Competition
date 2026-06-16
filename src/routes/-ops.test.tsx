import { describe, expect, test } from "vitest";

import { shouldRenderOpsCctvFallback } from "./ops";

describe("ops route nesting", () => {
  test("renders the CCTV fallback only on the exact field information route", () => {
    expect(shouldRenderOpsCctvFallback("/ops")).toBe(true);
    expect(shouldRenderOpsCctvFallback("/ops/cctv")).toBe(false);
    expect(shouldRenderOpsCctvFallback("/ops/data-health")).toBe(false);
  });
});
