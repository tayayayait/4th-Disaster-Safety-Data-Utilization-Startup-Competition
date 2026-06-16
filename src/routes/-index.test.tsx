import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useScenario } from "@/store/scenario";
import { LocationPermissionPrompt, Route, ShelterPicker } from "./index";
import type { RouteResult, Shelter } from "@/lib/types";

const clientMapMock = vi.hoisted(() => vi.fn());
const geocodeAddressMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const useAiAdviceMock = vi.hoisted(() => vi.fn(() => ({ data: null, isLoading: false })));
const useCctvFeedsMock = vi.hoisted(() =>
  vi.fn(() => ({ cameras: [], result: { data: [], status: "FALLBACK" }, isLoading: false })),
);
const useRoutesMock = vi.hoisted(() => vi.fn());
const useTrafficEventsMock = vi.hoisted(() => vi.fn(() => ({ events: [] })));
const riskAssessmentMock = vi.hoisted(() =>
  vi.fn(() => ({
    total: 12,
    level: "SAFE",
    reasons: [],
    missingDataCount: 0,
    weather: 0,
    floodTrace: 0,
    riverFlood: 0,
    disasterMessages: 0,
    underpass: 0,
    trafficControl: 0,
    floodTraceOverlap: 0,
    riverFloodOverlap: 0,
    safeMapEvidence: [],
    region: "강남구",
  })),
);

vi.mock("@/components/map/ClientMap", () => ({
  ClientMap: (props: unknown) => {
    clientMapMock(props);
    return <div data-testid="home-map" />;
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to?: string }) => (
      <a href={to ?? "#"}>{children}</a>
    ),
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/geocoding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/geocoding")>();
  return {
    ...actual,
    geocodeAddress: geocodeAddressMock,
  };
});

vi.mock("@/hooks/useShelters", () => ({
  useShelters: () => ({ shelters: [shelter], isLoading: false, error: null }),
}));

vi.mock("@/hooks/useRiskAssessment", () => ({
  useRiskAssessment: () => riskAssessmentMock(),
}));

vi.mock("@/hooks/useAiAdvice", () => ({
  useAiAdvice: (input: unknown) => useAiAdviceMock(input),
}));

vi.mock("@/hooks/useCctvFeeds", () => ({
  useCctvFeeds: (input: unknown) => useCctvFeedsMock(input),
}));

vi.mock("@/hooks/useRoutes", () => ({
  useRoutes: (input: unknown) => useRoutesMock(input),
}));

vi.mock("@/hooks/useTrafficEvents", () => ({
  useTrafficEvents: (input: unknown) => useTrafficEventsMock(input),
}));

const shelter: Shelter = {
  id: "s-01",
  name: "역삼초등학교 체육관",
  address: "서울 강남구 역삼로 153",
  position: { lat: 37.5005, lng: 127.0354 },
  capacity: 420,
  status: "OPERATING",
  underground: false,
  type: "민방위대피시설",
};

const actualRoute: RouteResult = {
  id: "actual-walk-route",
  mode: "WALK",
  status: "RECOMMENDED",
  name: "TMAP 실시간 보행 경로",
  distanceMeters: 880,
  durationSeconds: 760,
  safetyScore: 91,
  riskReasons: ["실제 교통통제 구간 회피", "실시간 보행 경로 안전점수 반영"],
  geometry: [{ lat: 37.4979, lng: 127.0276 }, shelter.position],
  shelterId: shelter.id,
};

const geocodeResult = {
  id: "manual-gangnam",
  label: "강남역",
  address: "서울 강남구 강남대로",
  position: { lat: 37.4979, lng: 127.0276 },
  source: "NAVER" as const,
};

const Home = Route.options.component!;

beforeEach(() => {
  clientMapMock.mockClear();
  geocodeAddressMock.mockReset();
  navigateMock.mockClear();
  useAiAdviceMock.mockClear();
  useCctvFeedsMock.mockClear();
  useRoutesMock.mockReset();
  useRoutesMock.mockReturnValue({
    routes: [actualRoute],
    results: {
      walk: {
        data: [actualRoute],
        status: "OK",
        timestamp: "2026-06-15T04:00:00.000Z",
        source: "tmap-pedestrian",
      },
      drive: {
        data: [],
        status: "FAILED",
        timestamp: "2026-06-15T04:00:00.000Z",
        source: "naver-directions",
        error: "No drive route",
      },
    },
    apiStatus: "FAILED",
    isLoading: false,
    fallbackShelters: [],
  });
  useTrafficEventsMock.mockClear();
  riskAssessmentMock.mockClear();
  useScenario.setState({
    origin: { lat: 37.4979, lng: 127.0276 },
    locationStatus: "PROMPT",
  });
});

describe("LocationPermissionPrompt", () => {
  test("is a non-modal prompt so bottom navigation remains reachable", () => {
    render(<LocationPermissionPrompt onAllow={vi.fn()} onDeny={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "위치 권한 요청" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "허용 안 함" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "위치 허용" })).toBeInTheDocument();
  });
});

describe("Home location gate", () => {
  test("does not render the map before the user chooses a location source", async () => {
    render(<Home />);

    expect(await screen.findByRole("region", { name: "위치 권한 요청" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "주소 검색" })).toBeInTheDocument();
    expect(screen.queryByTestId("home-map")).not.toBeInTheDocument();
    expect(clientMapMock).not.toHaveBeenCalled();
  });

  test("renders the map for the manually selected address", async () => {
    const user = userEvent.setup();
    geocodeAddressMock.mockResolvedValue([geocodeResult]);

    render(<Home />);

    await user.type(screen.getByRole("textbox"), "강남역");
    await user.click(screen.getByRole("button", { name: "주소 검색" }));
    await user.click(await screen.findByRole("button", { name: /강남역/ }));

    expect(await screen.findByTestId("home-map")).toBeInTheDocument();
    expect(clientMapMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: geocodeResult.position }),
    );
  });

  test("passes actual route analysis and flood evidence to AI advice after location is available", async () => {
    useScenario.setState({ locationStatus: "GRANTED" });
    riskAssessmentMock.mockReturnValue({
      total: 54,
      level: "WARNING",
      reasons: ["재난문자 위험지역", "지하차도 통과 가능성"],
      missingDataCount: 0,
      weather: 15,
      floodTrace: 20,
      riverFlood: 10,
      disasterMessages: 9,
      underpass: 0,
      trafficControl: 0,
      floodTraceOverlap: 0.34,
      riverFloodOverlap: 0.12,
      safeMapEvidence: [],
      region: "강남구",
    });

    render(<Home />);

    await screen.findByTestId("home-map");

    expect(useRoutesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        origin: { lat: 37.4979, lng: 127.0276 },
        shelters: [shelter],
      }),
    );
    expect(clientMapMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        routes: [actualRoute],
      }),
    );
    expect(useAiAdviceMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        recommendedRouteId: "actual-walk-route",
        distanceMeters: 880,
        dataTimestamp: "2026-06-15T04:00:00.000Z",
        routeReasons: expect.arrayContaining([
          "추천 도보 경로 TMAP 실시간 보행 경로",
          "안전점수 91점",
          "실제 교통통제 구간 회피",
          "실시간 보행 경로 안전점수 반영",
          "재난문자 위험지역",
          "지하차도 통과 가능성",
          "생활안전지도 침수흔적 중첩 34%",
          "생활안전지도 하천범람 중첩 12%",
        ]),
      }),
    );
  });

  test("limits home CCTV lookup and ignores tiny map bounds changes", async () => {
    useScenario.setState({ locationStatus: "GRANTED" });

    render(<Home />);

    await screen.findByTestId("home-map");
    expect(useCctvFeedsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: { lat: 37.4979, lng: 127.0276 },
        limit: 120,
      }),
    );

    const firstMapProps = clientMapMock.mock.lastCall?.[0] as {
      onBoundsChanged: (bounds: { minX: number; maxX: number; minY: number; maxY: number }) => void;
    };
    firstMapProps.onBoundsChanged({
      minX: 127.02,
      maxX: 127.05,
      minY: 37.49,
      maxY: 37.51,
    });

    await screen.findByTestId("home-map");
    expect(useCctvFeedsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bounds: { minX: 127.02, maxX: 127.05, minY: 37.49, maxY: 37.51 },
        limit: 120,
      }),
    );
    const callsAfterFirstBounds = useCctvFeedsMock.mock.calls.length;

    const secondMapProps = clientMapMock.mock.lastCall?.[0] as {
      onBoundsChanged: (bounds: { minX: number; maxX: number; minY: number; maxY: number }) => void;
    };
    secondMapProps.onBoundsChanged({
      minX: 127.0201,
      maxX: 127.0501,
      minY: 37.4901,
      maxY: 37.5101,
    });

    expect(useCctvFeedsMock).toHaveBeenCalledTimes(callsAfterFirstBounds);
  });
});

describe("ShelterPicker", () => {
  test("selects a shelter and can return to automatic recommendation", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    const { rerender } = render(
      <ShelterPicker
        shelters={[{ s: shelter, d: 290 }]}
        selectedShelterId={null}
        onSelect={onSelect}
      />,
    );

    const selector = screen.getByRole("combobox", { name: "홈 대피시설 선택" });
    await user.selectOptions(selector, shelter.id);
    expect(onSelect).toHaveBeenLastCalledWith(shelter.id);

    rerender(
      <ShelterPicker
        shelters={[{ s: shelter, d: 290 }]}
        selectedShelterId={shelter.id}
        onSelect={onSelect}
      />,
    );

    await user.selectOptions(selector, "");
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
