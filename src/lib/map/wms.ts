export interface WmsBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface WmsImageSize {
  width: number;
  height: number;
}

export interface WmsLayerConfig {
  id: string;
  label: string;
  endpoint: string;
  layerName: string;
  serviceKey: string;
  opacity: number;
  enabled: boolean;
  srs: "EPSG:4326";
}

export const SAFE_MAP_FLOOD_TRACE_WMS_LAYER = {
  id: "safemap-flood-trace",
  label: "침수흔적도",
  endpoint: "https://www.safemap.go.kr/openapi2/IF_0092_WMS",
  layerName: "A2SM_FLUDMARKS",
  opacity: 0.85,
  srs: "EPSG:4326",
} satisfies Omit<WmsLayerConfig, "serviceKey" | "enabled">;

export const SAFE_MAP_RIVER_FLOOD_WMS_LAYER = {
  id: "safemap-river-flood",
  label: "하천범람지도(국가하천)",
  endpoint: "https://www.safemap.go.kr/openapi2/IF_0089_WMS",
  layerName: "A2SM_FLOODFOVRRISK1",
  opacity: 0.85,
  srs: "EPSG:4326",
} satisfies Omit<WmsLayerConfig, "serviceKey" | "enabled">;

export function createSafeMapFloodTraceWmsLayer(serviceKey: string): WmsLayerConfig {
  return {
    ...SAFE_MAP_FLOOD_TRACE_WMS_LAYER,
    serviceKey,
    enabled: true,
  };
}

export function createSafeMapRiverFloodWmsLayer(serviceKey: string): WmsLayerConfig {
  return {
    ...SAFE_MAP_RIVER_FLOOD_WMS_LAYER,
    serviceKey,
    enabled: true,
  };
}

export function formatWmsBbox(bounds: WmsBounds) {
  return [bounds.west, bounds.south, bounds.east, bounds.north]
    .map((value) => value.toFixed(6))
    .join(",");
}

export function createBoundsFromCenter(
  center: { lat: number; lng: number },
  radiusMeters: number,
): WmsBounds {
  // Rough approximation: 1 degree latitude is ~111.32 km
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos(center.lat * (Math.PI / 180)));
  return {
    south: center.lat - latDelta,
    north: center.lat + latDelta,
    west: center.lng - lngDelta,
    east: center.lng + lngDelta,
  };
}

export function latLngToPixel(
  point: { lat: number; lng: number },
  bounds: WmsBounds,
  width: number,
  height: number,
) {
  const x = Math.round(((point.lng - bounds.west) / (bounds.east - bounds.west)) * width);
  // Y goes top to bottom in image, bounds.north is top
  const y = Math.round(((bounds.north - point.lat) / (bounds.north - bounds.south)) * height);
  return { x: Math.max(0, Math.min(width - 1, x)), y: Math.max(0, Math.min(height - 1, y)) };
}

export function buildSafeMapWmsImageUrl({
  layer,
  bounds,
  size,
}: {
  layer: WmsLayerConfig;
  bounds: WmsBounds;
  size: WmsImageSize;
}) {
  const url = new URL(layer.endpoint);
  url.searchParams.set("serviceKey", layer.serviceKey);
  url.searchParams.set("service", "WMS");
  url.searchParams.set("request", "GetMap");
  url.searchParams.set("version", "1.1.1");
  url.searchParams.set("layers", layer.layerName);
  url.searchParams.set("styles", "");
  url.searchParams.set("srs", layer.srs);
  url.searchParams.set("bbox", formatWmsBbox(bounds));
  url.searchParams.set("format", "image/png");
  url.searchParams.set("width", String(Math.round(size.width)));
  url.searchParams.set("height", String(Math.round(size.height)));
  url.searchParams.set("transparent", "TRUE");

  // 보안 검토: WMS GetMap 요청은 브라우저 렌더러에서 직접 타일 이미지를 로드해야 하므로
  // 클라이언트 사이드에서 URL이 완성되며 SAFEMAP_SERVICE_KEY 노출이 불가피합니다.
  // 키 발급처(공공데이터포털)에서 도메인/Referrer 제한(HTTP Referer 정책)을 설정하여 오용을 방지해야 합니다.
  return url;
}
