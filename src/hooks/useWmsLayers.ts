import { useMemo } from "react";
import { getSafeMapWmsLayers } from "@/lib/api/wmsConfig";
import { useScenario } from "@/store/scenario";

export function useWmsLayers() {
  const { wmsStatus } = useScenario();

  return useMemo(() => {
    const layers = getSafeMapWmsLayers();
    return layers.map((layer) => ({
      ...layer,
      enabled: wmsStatus === "OK",
    }));
  }, [wmsStatus]);
}
