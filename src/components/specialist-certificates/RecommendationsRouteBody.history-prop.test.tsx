import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationsListRouteBody } from "./RecommendationsRouteBody";

vi.mock("@/components/specialist-certificates/OwnerIssuerGate", () => ({
  OwnerIssuerGate: ({
    canLinkOnboardingHistory,
    children,
  }: {
    canLinkOnboardingHistory?: boolean;
    children: React.ReactNode;
  }) => (
    <div data-testid="owner-issuer-gate" data-can-link={String(canLinkOnboardingHistory)}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/specialist-certificates/OwnerIssuerModeContext", () => ({
  useOwnerIssuerMode: () => null,
  useOwnerIssuerModeValue: () => null,
}));

describe("RecommendationsListRouteBody history prop chain", () => {
  it("forwards canLinkOnboardingHistory to OwnerIssuerGate", () => {
    render(<RecommendationsListRouteBody canLinkOnboardingHistory={false} />);
    expect(screen.getByTestId("owner-issuer-gate")).toHaveAttribute("data-can-link", "false");
  });
});
