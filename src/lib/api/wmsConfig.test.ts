import { afterEach, describe, expect, test, vi } from "vitest";

import { getSafeMapWmsLayers } from "./wmsConfig";

describe("getSafeMapWmsLayers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns no client WMS layer without a Vite-exposed SafeMap key", () => {
    vi.stubEnv("VITE_SAFEMAP_SERVICE_KEY", "");

    expect(getSafeMapWmsLayers()).toEqual([]);
  });

  test("returns flood-trace and river-flood layers when the SafeMap key is configured", () => {
    vi.stubEnv("VITE_SAFEMAP_SERVICE_KEY", "demo-key");

    expect(getSafeMapWmsLayers()).toEqual([
      expect.objectContaining({
        id: "safemap-flood-trace",
        serviceKey: "demo-key",
        enabled: true,
      }),
      expect.objectContaining({
        id: "safemap-river-flood",
        serviceKey: "demo-key",
        enabled: true,
      }),
    ]);
  });
});
