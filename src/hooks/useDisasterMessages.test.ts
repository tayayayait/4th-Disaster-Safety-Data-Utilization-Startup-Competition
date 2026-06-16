import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, test, vi } from "vitest";

import {
  createDisasterMessagesFallbackResult,
  fetchDisasterMessages,
  formatDisasterMessageStartDate,
  useDisasterMessages,
} from "./useDisasterMessages";

const wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("createDisasterMessagesFallbackResult", () => {
  test("returns demo disaster messages as an explicit fallback result", () => {
    const result = createDisasterMessagesFallbackResult(() => 1_000);

    expect(result.status).toBe("FALLBACK");
    expect(result.source).toBe("demo-disaster-messages");
    expect(result.data?.[0]?.region).toBe("서울 강남구");
  });
});

describe("fetchDisasterMessages", () => {
  test("passes request parameters to the Edge fetcher and parses messages", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      messages: [
        {
          id: "100",
          region: "서울 강남구",
          body: "호우로 인한 침수 위험",
          issuedAt: "2026-06-12 10:00:00",
          source: "MOIS-DSSP-IF-00247",
          emergencyLevel: "긴급재난",
          disasterType: "호우",
        },
      ],
    });

    await expect(
      fetchDisasterMessages(
        { region: "서울 강남구", startDate: "20260612", pageNo: 2, numOfRows: 10 },
        fetcher,
      ),
    ).resolves.toMatchObject([
      {
        id: "100",
        disasterType: "호우",
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith({
      region: "서울 강남구",
      startDate: "20260612",
      pageNo: 2,
      numOfRows: 10,
    });
  });
});

describe("useDisasterMessages", () => {
  test("loads disaster messages through the injected Edge client", async () => {
    const client = vi.fn().mockResolvedValue({
      messages: [
        {
          id: "100",
          region: "서울 강남구",
          body: "강남구 침수 위험",
          issuedAt: "2026-06-12 10:00:00",
          source: "MOIS-DSSP-IF-00247",
        },
      ],
    });

    const { result } = renderHook(
      () =>
        useDisasterMessages({
          region: "서울 강남구",
          startDate: "20260612",
          client,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.result.status).toBe("OK");
    expect(result.current.result.data?.[0]?.body).toContain("침수");
  });

  test("falls back to demo messages when the Edge client fails", async () => {
    const { result } = renderHook(
      () =>
        useDisasterMessages({
          region: "서울 강남구",
          startDate: "20260612",
          client: vi.fn().mockRejectedValue(new Error("upstream unavailable")),
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.result.status).toBe("FALLBACK");
    expect(result.current.result.error).toBe("upstream unavailable");
  });

  test("formats the default request date as YYYYMMDD", () => {
    expect(formatDisasterMessageStartDate(new Date("2026-06-12T10:00:00+09:00"))).toBe("20260612");
  });
});
