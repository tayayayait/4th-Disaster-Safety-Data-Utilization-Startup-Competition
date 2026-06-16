import { afterEach, describe, expect, test, vi } from "vitest";

import { fetchJson } from "./upstream";

describe("edge upstream helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("parses successful JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    await expect(fetchJson("https://example.test/ok")).resolves.toEqual({ ok: true });
  });

  test("aborts slow upstream requests after the configured timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = fetchJson("https://example.test/slow", undefined, {
      timeoutMs: 1000,
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);

    const error = await request;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Upstream request timed out after 1000ms");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
