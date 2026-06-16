import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { CctvFeed } from "@/lib/api/cctvInfo";
import { DEFAULT_CCTV_RADIUS_METERS, useCctvFeeds } from "./useCctvFeeds";

const fetchCctvFeedsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/cctvInfo", () => ({
  fetchCctvFeeds: fetchCctvFeedsMock,
}));

const wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useCctvFeeds", () => {
  beforeEach(() => {
    fetchCctvFeedsMock.mockReset();
    fetchCctvFeedsMock.mockResolvedValue([]);
  });

  test("requests the stable expressway CCTV source for center-based lookup", async () => {
    const center = { lat: 35.16539, lng: 126.90928 };

    renderHook(() => useCctvFeeds({ center }), { wrapper });

    await waitFor(() => expect(fetchCctvFeedsMock).toHaveBeenCalledTimes(1));
    expect(fetchCctvFeedsMock).toHaveBeenCalledWith({
      center,
      radiusMeters: DEFAULT_CCTV_RADIUS_METERS,
      roadType: "ex",
      cctvType: "4",
    });
  });

  test("requests the stable expressway CCTV source for map bounds lookup", async () => {
    const bounds = { minX: 126.85, maxX: 126.96, minY: 35.12, maxY: 35.21 };

    renderHook(() => useCctvFeeds({ bounds }), { wrapper });

    await waitFor(() => expect(fetchCctvFeedsMock).toHaveBeenCalledTimes(1));
    expect(fetchCctvFeedsMock).toHaveBeenCalledWith({
      bounds,
      roadType: "ex",
      cctvType: "4",
    });
  });

  test("passes all-road nationwide options when explicitly requested", async () => {
    const bounds = { minX: 124, maxX: 132, minY: 33, maxY: 39.6 };

    renderHook(() => useCctvFeeds({ bounds, roadType: "all", limit: 5000 }), { wrapper });

    await waitFor(() => expect(fetchCctvFeedsMock).toHaveBeenCalledTimes(1));
    expect(fetchCctvFeedsMock).toHaveBeenCalledWith({
      bounds,
      limit: 5000,
      roadType: "all",
      cctvType: "4",
    });
  });

  test("keeps the last successful cameras when a later lookup fails", async () => {
    const firstCamera: CctvFeed = {
      id: "cctv-1",
      roadSectionId: "road-1",
      fileCreatedAt: "2026-06-15T09:00:00+09:00",
      cctvType: "4",
      streamUrl: "https://example.com/cctv-1.m3u8",
      resolution: "1280x720",
      position: { lat: 37.4979, lng: 127.0276 },
      format: "HLS",
      name: "Gangnam CCTV",
      source: "ITS cctvInfo",
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchCctvFeedsMock.mockResolvedValueOnce([firstCamera]);
    fetchCctvFeedsMock.mockRejectedValueOnce(new Error("API Timeout"));

    const { result, rerender } = renderHook(
      ({ center }) => useCctvFeeds({ center }),
      {
        initialProps: { center: { lat: 37.4979, lng: 127.0276 } },
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.cameras).toEqual([firstCamera]));

    rerender({ center: { lat: 37.501, lng: 127.031 } });

    await waitFor(() => expect(fetchCctvFeedsMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.result.error).toBe("API Timeout"));
    expect(result.current.cameras).toEqual([firstCamera]);

    warnSpy.mockRestore();
  });
});
