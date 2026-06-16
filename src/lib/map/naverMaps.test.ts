import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { loadNaverMapsSDK, resetNaverMapsSDKLoaderForTest } from "./naverMaps";

const naverApi = {
  maps: { Service: { geocode: () => undefined } },
} as unknown as NaverMapsNamespace;

describe("loadNaverMapsSDK", () => {
  beforeEach(() => {
    resetNaverMapsSDKLoaderForTest();
    document.head.innerHTML = "";
    window.naver = undefined;
  });

  afterEach(() => {
    resetNaverMapsSDKLoaderForTest();
    document.head.innerHTML = "";
    window.naver = undefined;
  });

  test("resolves immediately when the SDK is already available", async () => {
    window.naver = naverApi;

    await expect(loadNaverMapsSDK("client-id")).resolves.toBe(naverApi);
    expect(document.querySelectorAll("script").length).toBe(0);
  });

  test("rejects when the client id is missing", async () => {
    await expect(loadNaverMapsSDK("")).rejects.toThrow("VITE_NAVER_MAPS_CLIENT_ID");
    expect(document.querySelectorAll("script").length).toBe(0);
  });

  test("inserts one script and reuses the pending load", async () => {
    const first = loadNaverMapsSDK("client-id");
    const second = loadNaverMapsSDK("client-id");
    const scripts = document.querySelectorAll<HTMLScriptElement>("script[data-naver-maps-sdk]");

    expect(scripts.length).toBe(1);
    expect(scripts[0]?.src).toContain("ncpKeyId=client-id");
    expect(scripts[0]?.src).toContain("submodules=geocoder");

    window.naver = naverApi;
    scripts[0]?.dispatchEvent(new Event("load"));

    await expect(first).resolves.toBe(naverApi);
    await expect(second).resolves.toBe(naverApi);
  });
});
