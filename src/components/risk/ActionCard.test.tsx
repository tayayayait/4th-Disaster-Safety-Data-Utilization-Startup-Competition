import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ActionCard } from "./ActionCard";
import { RISK_META } from "@/lib/risk";
import type { RiskLevel, Shelter } from "@/lib/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    search,
    to,
  }: {
    children: React.ReactNode;
    search?: Record<string, string>;
    to: string;
  }) => {
    const href = search ? `${to}?${new URLSearchParams(search).toString()}` : to;
    return <a href={href}>{children}</a>;
  },
}));

const shelter: Shelter = {
  id: "s-05",
  name: "역삼1동주민센터",
  address: "서울 강남구 봉은사로4길 13",
  position: { lat: 37.5023, lng: 127.0301 },
  capacity: 180,
  status: "OPERATING",
  underground: false,
  type: "지자체 대피시설",
};

describe("ActionCard", () => {
  test.each<RiskLevel>(["SAFE", "WATCH", "WARNING", "CRITICAL", "UNKNOWN"])(
    "renders the %s risk action copy",
    (level) => {
      render(<ActionCard level={level} shelter={shelter} timestamp="2026-06-11T14:30:00+09:00" />);

      expect(screen.getByText(RISK_META[level].actionTitle)).toBeInTheDocument();
      expect(screen.getByText(RISK_META[level].ctaLabel)).toBeInTheDocument();
    },
  );

  test("shows API fallback status and formatted timestamp", () => {
    render(
      <ActionCard
        level="WARNING"
        shelter={shelter}
        distanceMeters={537}
        timestamp="2026-06-11T14:30:00+09:00"
        apiStatus="FALLBACK"
      />,
    );

    expect(screen.getByText(/대체 데이터/)).toBeInTheDocument();
    expect(screen.getByText(/2026-06-11 14:30/)).toBeInTheDocument();
  });

  test("uses a custom shelter label when the shelter was manually selected", () => {
    render(
      <ActionCard
        level="SAFE"
        shelter={shelter}
        timestamp="2026-06-11T14:30:00+09:00"
        shelterLabel="선택 대피소"
      />,
    );

    expect(screen.getByText("선택 대피소")).toBeInTheDocument();
  });

  test("opens route comparison only through the home route action buttons", () => {
    render(<ActionCard level="SAFE" shelter={shelter} timestamp="2026-06-11T14:30:00+09:00" />);

    expect(screen.getByRole("link", { name: /경로 미리 보기/ })).toHaveAttribute(
      "href",
      "/routes?mode=WALK",
    );
    expect(screen.getByRole("link", { name: /차량 경로/ })).toHaveAttribute(
      "href",
      "/routes?mode=DRIVE",
    );
  });

  test("does not promise a safe path when the route may require risk review", () => {
    expect(RISK_META.WARNING.ctaLabel).toBe("경로 위험 확인");
  });
});
