const NAVER_MAPS_SDK_SCRIPT_ID = "naver-maps-sdk";

let sdkPromise: Promise<NaverMapsNamespace> | null = null;

const getLoadedSDK = () => {
  if (typeof window === "undefined") return null;
  return window.naver?.maps ? window.naver : null;
};

const buildScriptSrc = (clientId: string) => {
  const url = new URL("https://oapi.map.naver.com/openapi/v3/maps.js");
  url.searchParams.set("ncpKeyId", clientId);
  url.searchParams.set("submodules", "geocoder");
  return url.toString();
};

export const getNaverMapsClientId = () => import.meta.env.VITE_NAVER_MAPS_CLIENT_ID?.trim() ?? "";

export const loadNaverMapsSDK = (clientId = getNaverMapsClientId()) => {
  const existing = getLoadedSDK();
  if (existing) return Promise.resolve(existing);

  const trimmedClientId = clientId.trim();
  if (!trimmedClientId) {
    return Promise.reject(new Error("VITE_NAVER_MAPS_CLIENT_ID is required"));
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<NaverMapsNamespace>((resolve, reject) => {
    const currentScript = document.getElementById(NAVER_MAPS_SDK_SCRIPT_ID);
    const script =
      currentScript instanceof HTMLScriptElement ? currentScript : document.createElement("script");

    script.id = NAVER_MAPS_SDK_SCRIPT_ID;
    script.dataset.naverMapsSdk = "true";
    script.async = true;
    script.defer = true;
    script.src = buildScriptSrc(trimmedClientId);

    script.addEventListener(
      "load",
      () => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          const sdk = getLoadedSDK();

          if (sdk?.maps?.Service?.geocode) {
            clearInterval(checkInterval);
            resolve(sdk);
          } else if (attempts >= 100) {
            // 5초 경과 시 타임아웃
            clearInterval(checkInterval);
            if (sdk) {
              resolve(sdk); // sdk라도 있으면 일단 resolve (geocode 호출에서 fallback)
            } else {
              sdkPromise = null;
              reject(new Error("Naver Maps SDK loaded without window.naver.maps"));
            }
          }
        }, 50);
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => {
        sdkPromise = null;
        reject(new Error("Naver Maps SDK load failed"));
      },
      { once: true },
    );

    if (!currentScript) {
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
};

export const resetNaverMapsSDKLoaderForTest = () => {
  sdkPromise = null;
};
