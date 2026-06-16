import { afterEach, describe, expect, test, vi } from "vitest";

import { supabase } from "@/integrations/supabase/client";
import { fetchWmsGetFeatureInfo } from "./wmsFeatureInfo";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const invoke = vi.mocked(supabase.functions.invoke);

describe("fetchWmsGetFeatureInfo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    invoke.mockReset();
  });

  test("routes SafeMap GetFeatureInfo through the Edge Function instead of direct browser fetch", async () => {
    const directFetch = vi.fn(() => {
      throw new Error("direct SafeMap fetch should not run in browser");
    });
    vi.stubGlobal("fetch", directFetch);
    invoke.mockResolvedValue({
      data: { overlap: 1, features: [{ id: "risk-zone" }] },
      error: null,
    });

    const result = await fetchWmsGetFeatureInfo({
      endpoint: "https://www.safemap.go.kr/openapi2/IF_0089_WMS",
      layer: "A2SM_FLOODFOVRRISK1",
      bounds: {
        west: 127.021939,
        south: 37.493408,
        east: 127.033261,
        north: 37.502392,
      },
      point: { lat: 37.4979, lng: 127.0276 },
    });

    expect(result).toEqual({ overlap: 1, features: [{ id: "risk-zone" }] });
    expect(directFetch).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("safemap-feature-info", {
      body: {
        endpoint: "https://www.safemap.go.kr/openapi2/IF_0089_WMS",
        layer: "A2SM_FLOODFOVRRISK1",
        bounds: {
          west: 127.021939,
          south: 37.493408,
          east: 127.033261,
          north: 37.502392,
        },
        point: { lat: 37.4979, lng: 127.0276 },
      },
    });
  });
});
