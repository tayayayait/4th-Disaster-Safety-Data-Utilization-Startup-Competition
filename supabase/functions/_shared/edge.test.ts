import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { corsHeaders, handleCorsPreflight, jsonError, jsonOk } from "./cors";
import {
  assertAllowedMethod,
  parseJsonBody,
  validateGeminiPromptRequest,
  validateLatLngRequest,
} from "./validation";

describe("edge shared CORS helpers", () => {
  test("returns a 204 response for OPTIONS preflight", () => {
    const response = handleCorsPreflight(
      new Request("https://example.test", { method: "OPTIONS" }),
    );

    expect(response?.status).toBe(204);
    expect(response?.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response?.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(response?.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  test("serializes ok and error JSON responses with CORS headers", async () => {
    const ok = jsonOk({ value: "ok" });
    const bad = jsonError("bad request", 400);

    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(
      corsHeaders["Access-Control-Allow-Origin"],
    );
    expect(await ok.json()).toEqual({ value: "ok" });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "bad request" });
  });
});

describe("edge deployment manifest", () => {
  test("includes the sensors function used by the client", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const deployScript = readFileSync("scripts/deploy-supabase-all.ps1", "utf8");

    expect(config).toContain("[functions.sensors]");
    expect(config).toContain('entrypoint = "./functions/sensors/index.ts"');
    expect(deployScript).toMatch(/"sensors"/);
  });

  test("includes the SafeMap feature info proxy used by the client", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const deployScript = readFileSync("scripts/deploy-supabase-all.ps1", "utf8");

    expect(config).toContain("[functions.safemap-feature-info]");
    expect(config).toContain('entrypoint = "./functions/safemap-feature-info/index.ts"');
    expect(deployScript).toMatch(/"safemap-feature-info"/);
  });

  test("includes the ITS traffic event proxy used by route ranking", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const deployScript = readFileSync("scripts/deploy-supabase-all.ps1", "utf8");

    expect(config).toContain("[functions.traffic-events]");
    expect(config).toContain('entrypoint = "./functions/traffic-events/index.ts"');
    expect(deployScript).toMatch(/"traffic-events"/);
  });

  test("includes the ITS CCTV proxy used by the operator console", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const deployScript = readFileSync("scripts/deploy-supabase-all.ps1", "utf8");

    expect(config).toContain("[functions.cctv-info]");
    expect(config).toContain('entrypoint = "./functions/cctv-info/index.ts"');
    expect(deployScript).toMatch(/"cctv-info"/);
  });

  test("does not deploy the removed route elevation proxy", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    const deployScript = readFileSync("scripts/deploy-supabase-all.ps1", "utf8");

    expect(config).not.toContain("[functions.route-elevation]");
    expect(config).not.toContain('entrypoint = "./functions/route-elevation/index.ts"');
    expect(deployScript).not.toMatch(/"route-elevation"/);
  });
});

describe("edge shared validation helpers", () => {
  test("parses JSON request bodies", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });

    await expect(parseJsonBody(request)).resolves.toEqual({ ok: true });
  });

  test("rejects unsupported methods", () => {
    expect(() => assertAllowedMethod("GET", ["POST"])).toThrow("Method not allowed");
  });

  test("validates route coordinate requests", () => {
    expect(
      validateLatLngRequest({
        origin: { lat: 37.4979, lng: 127.0276 },
        destination: { lat: 37.5023, lng: 127.0301 },
      }),
    ).toEqual({
      origin: { lat: 37.4979, lng: 127.0276 },
      destination: { lat: 37.5023, lng: 127.0301 },
    });

    expect(() => validateLatLngRequest({ origin: { lat: 100, lng: 0 } })).toThrow("Invalid origin");
  });

  test("validates Gemini prompt requests with bounded text fields", () => {
    expect(
      validateGeminiPromptRequest({
        question: "대피해도 되나요?",
        riskLevel: "WARNING",
        shelterName: "역삼1동주민센터",
        routeReasons: ["침수흔적 우회"],
        dataTimestamp: "2026-06-11T14:30:00+09:00",
      }).riskLevel,
    ).toBe("WARNING");

    expect(() =>
      validateGeminiPromptRequest({
        question: "",
        riskLevel: "WARNING",
        shelterName: "역삼1동주민센터",
        routeReasons: [],
        dataTimestamp: "2026-06-11T14:30:00+09:00",
      }),
    ).toThrow("Invalid question");
  });
});
