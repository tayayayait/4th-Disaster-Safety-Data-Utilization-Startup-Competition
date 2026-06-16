import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useScenario } from "@/store/scenario";
import type { Shelter } from "@/lib/types";
import { Route } from "./shelters";

const farReturnedShelter: Shelter = {
  id: "nearest-outside-radius",
  name: "반경 밖 최인접 대피소",
  address: "경상북도 구미시",
  position: { lat: 36.2195, lng: 128.3446 },
  capacity: 240,
  status: "OPERATING",
  underground: false,
  type: "이재민 임시주거시설",
};

vi.mock("@/hooks/useShelters", () => ({
  useShelters: () => ({ shelters: [farReturnedShelter], isLoading: false, error: null }),
}));

const SheltersPage = Route.options.component!;

describe("SheltersPage", () => {
  beforeEach(() => {
    useScenario.setState({
      origin: { lat: 36.1195, lng: 128.3446 },
      locationStatus: "GRANTED",
    });
  });

  test("shows nearest returned shelters instead of hiding all results outside 5km", () => {
    render(<SheltersPage />);

    expect(screen.getByText("반경 밖 최인접 대피소")).toBeInTheDocument();
    expect(screen.getByText(/1개/)).toBeInTheDocument();
  });
});
