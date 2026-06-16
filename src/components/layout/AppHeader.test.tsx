import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useScenario } from "@/store/scenario";
import { AppHeader } from "./AppHeader";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

describe("AppHeader", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    useScenario.setState({ locationStatus: "GRANTED" });
  });

  test("returns the citizen logo area to the initial address setup screen", async () => {
    const user = userEvent.setup();

    render(<AppHeader />);

    await user.click(
      screen.getByRole("button", { name: "침수퇴로 AI 초기 주소 설정 화면으로 이동" }),
    );

    expect(useScenario.getState().locationStatus).toBe("PROMPT");
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });

  test("keeps the field header as static information", () => {
    render(<AppHeader context="field" />);

    expect(screen.queryByRole("button", { name: /초기 주소 설정 화면/ })).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
