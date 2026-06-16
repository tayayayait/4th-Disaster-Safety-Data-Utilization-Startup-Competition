import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, test, vi } from "vitest";

import { useWeather } from "./useWeather";

const wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useWeather", () => {
  test("requests KMA weather by grid and returns a normalized snapshot", async () => {
    const weatherClient = vi.fn().mockResolvedValue({
      observedAt: "20260610T2300",
      rainfallMmPerHour: 18,
      humidityPercent: 91,
      precipitationProbabilityPercent: 70,
      precipitationAmount: "5mm",
      precipitationType: "rain",
      alerts: [],
    });

    const { result } = renderHook(
      () =>
        useWeather({
          origin: { lat: 37.5665, lng: 126.978 },
          now: new Date("2026-06-11T00:20:00+09:00"),
          client: weatherClient,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(weatherClient).toHaveBeenCalledWith({
      nx: 60,
      ny: 127,
      baseDate: "20260610",
      baseTime: "2300",
    });
    expect(result.current.result.data?.humidityPercent).toBe(91);
    expect(result.current.result.status).toBe("OK");
  });
});
