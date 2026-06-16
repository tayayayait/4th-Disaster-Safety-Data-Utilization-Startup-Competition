import { describe, expect, test } from "vitest";

import {
  SAFE_MAP_FLOOD_TRACE_WMS_LAYER,
  SAFE_MAP_RIVER_FLOOD_WMS_LAYER,
  buildSafeMapWmsImageUrl,
  createSafeMapFloodTraceWmsLayer,
  createSafeMapRiverFloodWmsLayer,
} from "./wms";

describe("SafeMap WMS helpers", () => {
  test("builds a flood-trace WMS image URL from bounds and viewport size", () => {
    const url = buildSafeMapWmsImageUrl({
      layer: createSafeMapFloodTraceWmsLayer("demo service key"),
      bounds: {
        west: 126.84814453125,
        south: 35.137879119634185,
        east: 126.859130859375,
        north: 35.146862906756304,
      },
      size: { width: 320, height: 240 },
    });

    expect(url.origin).toBe("https://www.safemap.go.kr");
    expect(url.pathname).toBe("/openapi2/IF_0092_WMS");
    expect(url.searchParams.get("serviceKey")).toBe("demo service key");
    expect(url.searchParams.get("service")).toBe("WMS");
    expect(url.searchParams.get("request")).toBe("GetMap");
    expect(url.searchParams.get("version")).toBe("1.1.1");
    expect(url.searchParams.get("layers")).toBe("A2SM_FLUDMARKS");
    expect(url.searchParams.get("srs")).toBe("EPSG:4326");
    expect(url.searchParams.get("bbox")).toBe("126.848145,35.137879,126.859131,35.146863");
    expect(url.searchParams.get("format")).toBe("image/png");
    expect(url.searchParams.get("width")).toBe("320");
    expect(url.searchParams.get("height")).toBe("240");
    expect(url.searchParams.get("transparent")).toBe("TRUE");
  });

  test("uses the documented SafeMap flood layer metadata", () => {
    expect(SAFE_MAP_FLOOD_TRACE_WMS_LAYER.id).toBe("safemap-flood-trace");
    expect(SAFE_MAP_FLOOD_TRACE_WMS_LAYER.layerName).toBe("A2SM_FLUDMARKS");
    expect(SAFE_MAP_FLOOD_TRACE_WMS_LAYER.endpoint).toContain("IF_0092_WMS");
  });

  test("builds the documented national river flood WMS layer URL", () => {
    const url = buildSafeMapWmsImageUrl({
      layer: createSafeMapRiverFloodWmsLayer("demo-key"),
      bounds: {
        west: 126.84814453125,
        south: 35.137879119634185,
        east: 126.859130859375,
        north: 35.146862906756304,
      },
      size: { width: 256, height: 256 },
    });

    expect(SAFE_MAP_RIVER_FLOOD_WMS_LAYER.id).toBe("safemap-river-flood");
    expect(SAFE_MAP_RIVER_FLOOD_WMS_LAYER.layerName).toBe("A2SM_FLOODFOVRRISK1");
    expect(SAFE_MAP_RIVER_FLOOD_WMS_LAYER.endpoint).toContain("IF_0089_WMS");
    expect(url.pathname).toBe("/openapi2/IF_0089_WMS");
    expect(url.searchParams.get("layers")).toBe("A2SM_FLOODFOVRRISK1");
    expect(url.searchParams.get("service")).toBe("WMS");
    expect(url.searchParams.get("request")).toBe("GetMap");
    expect(url.searchParams.get("version")).toBe("1.1.1");
  });
});
