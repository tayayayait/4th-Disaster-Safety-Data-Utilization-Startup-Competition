import { supabase } from "@/integrations/supabase/client";
import type { LatLng } from "@/lib/types";
import type { WmsBounds } from "@/lib/map/wms";

export async function fetchWmsGetFeatureInfo(params: {
  endpoint: string;
  layer: string;
  bounds: WmsBounds;
  point: LatLng;
}): Promise<{ overlap: number; features: unknown[] }> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      overlap: number;
      features: unknown[];
    }>("safemap-feature-info", {
      body: {
        endpoint: params.endpoint,
        layer: params.layer,
        bounds: params.bounds,
        point: params.point,
      },
    });

    if (error) {
      console.error(`WMS GetFeatureInfo proxy failed for layer ${params.layer}:`, error.message);
      return { overlap: 0, features: [] };
    }

    return {
      overlap: typeof data?.overlap === "number" ? data.overlap : 0,
      features: Array.isArray(data?.features) ? data.features : [],
    };
  } catch (error) {
    console.error(`WMS GetFeatureInfo exception for layer ${params.layer}:`, error);
    return { overlap: 0, features: [] };
  }
}
