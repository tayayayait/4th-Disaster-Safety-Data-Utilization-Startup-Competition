import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { TrafficEvent } from "@/lib/types";
import { useTrafficEvents } from "./useTrafficEvents";

const fetchTrafficEventsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/trafficEvents", () => ({
  fetchTrafficEvents: fetchTrafficEventsMock,
}));

const wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const trafficEvent: TrafficEvent = {
  id: "event-1",
  type: "고속도로",
  eventType: "공사",
  position: { lat: 37.525317, lng: 126.953527 },
  roadName: "강변북로",
  message: "강변북로 공사",
  source: "ITS eventInfo",
};

describe("useTrafficEvents", () => {
  beforeEach(() => {
    fetchTrafficEventsMock.mockReset();
    fetchTrafficEventsMock.mockResolvedValue({ events: [], status: "OK", source: "ITS eventInfo" });
  });

  test("maps pending-access Edge responses to fallback instead of OK", async () => {
    fetchTrafficEventsMock.mockResolvedValueOnce({
      events: [],
      source: "ITS eventInfo",
      status: "PENDING_ACCESS",
      message: "ITS eventInfo request timed out",
    });

    const { result } = renderHook(() => useTrafficEvents({ lat: 37.5665, lng: 126.978 }), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.result.error).toBe("ITS eventInfo request timed out"),
    );
    expect(result.current.result.status).toBe("FALLBACK");
    expect(result.current.events).toEqual([]);
  });

  test("keeps the last successful traffic events when a later lookup is pending", async () => {
    fetchTrafficEventsMock.mockResolvedValueOnce({
      events: [trafficEvent],
      status: "OK",
      source: "ITS eventInfo",
    });
    fetchTrafficEventsMock.mockResolvedValueOnce({
      events: [],
      source: "ITS eventInfo",
      status: "PENDING_ACCESS",
      message: "ITS eventInfo request timed out",
    });

    const { result, rerender } = renderHook(({ origin }) => useTrafficEvents(origin), {
      initialProps: { origin: { lat: 37.5665, lng: 126.978 } },
      wrapper,
    });

    await waitFor(() => expect(result.current.events).toEqual([trafficEvent]));

    rerender({ origin: { lat: 37.567, lng: 126.979 } });

    await waitFor(() => expect(fetchTrafficEventsMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.result.error).toBe("ITS eventInfo request timed out"),
    );
    expect(result.current.events).toEqual([trafficEvent]);
  });
});
