import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { SafeMapEvidencePanel } from "./SafeMapEvidencePanel";

describe("SafeMapEvidencePanel", () => {
  test("renders SafeMap evidence summaries and sources", () => {
    render(
      <SafeMapEvidencePanel
        evidence={[
          {
            id: "safemap-flood-trace",
            label: "침수흔적도",
            severity: "WARNING",
            summary: "현재 위치가 과거 침수 이력 구역과 겹칩니다.",
            detail: "SafeMap 침수흔적도 기준으로 침수흔적 영역이 확인됐습니다.",
            source: "SafeMap IF_0092_WMS",
            featureCount: 2,
          },
        ]}
      />,
    );

    expect(screen.getByText("위험 근거")).toBeInTheDocument();
    expect(screen.getByText("침수흔적도")).toBeInTheDocument();
    expect(screen.getByText("현재 위치가 과거 침수 이력 구역과 겹칩니다.")).toBeInTheDocument();
    expect(screen.getByText(/SafeMap IF_0092_WMS/)).toBeInTheDocument();
  });

  test("renders nothing without evidence", () => {
    const { container } = render(<SafeMapEvidencePanel evidence={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
