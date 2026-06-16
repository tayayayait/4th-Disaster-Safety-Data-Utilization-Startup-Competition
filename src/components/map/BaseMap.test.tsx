import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { BaseMap } from "./BaseMap";
import type { LatLng, RouteResult, Shelter } from "@/lib/types";

const center: LatLng = { lat: 37.4979, lng: 127.0276 };

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

const route: RouteResult = {
  id: "walk-rec",
  mode: "WALK",
  status: "RECOMMENDED",
  name: "추천 도보 경로",
  distanceMeters: 920,
  durationSeconds: 840,
  safetyScore: 86,
  riskReasons: ["침수흔적 중첩 구간 회피"],
  geometry: [center, shelter.position],
  shelterId: shelter.id,
};

describe("BaseMap", () => {
  test("renders current location, shelters, and routes without map SDK dependencies", () => {
    render(<BaseMap center={center} shelters={[shelter]} routes={[route]} />);

    expect(screen.getByLabelText("현재 위치")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /대피소: 역삼초등학교 체육관/ })).toBeInTheDocument();
    expect(screen.getByLabelText("추천 도보 경로 경로선")).toBeInTheDocument();
  });

  test("calls onShelterClick when a shelter marker is selected", async () => {
    const user = userEvent.setup();
    const onShelterClick = vi.fn();

    render(<BaseMap center={center} shelters={[shelter]} onShelterClick={onShelterClick} />);

    await user.click(screen.getByRole("button", { name: /대피소: 역삼초등학교 체육관/ }));

    expect(onShelterClick).toHaveBeenCalledWith(shelter);
  });

  test("opens a visible shelter detail panel when a shelter marker is selected", async () => {
    const user = userEvent.setup();

    render(<BaseMap center={center} shelters={[shelter]} />);

    await user.click(screen.getByRole("button", { name: /대피소: 역삼초등학교 체육관/ }));

    expect(screen.getByRole("dialog", { name: /대피소 상세/ })).toHaveTextContent(
      "역삼초등학교 체육관",
    );
    expect(screen.getByText("서울 강남구 역삼로 153")).toBeInTheDocument();
  });
});
