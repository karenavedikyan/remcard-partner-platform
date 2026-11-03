import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientsListWorkspace } from "./ClientsListWorkspace";

vi.mock("@/components/clients/OwnerClientsGate", () => ({
  OwnerClientsGate: ({
    canLinkOnboardingHistory,
    children,
  }: {
    canLinkOnboardingHistory?: boolean;
    children: React.ReactNode;
  }) => (
    <div data-testid="owner-clients-gate" data-can-link={String(canLinkOnboardingHistory)}>
      {children}
    </div>
  ),
}));

describe("ClientsListWorkspace history prop chain", () => {
  it("forwards canLinkOnboardingHistory to OwnerClientsGate", () => {
    render(<ClientsListWorkspace canLinkOnboardingHistory />);
    expect(screen.getByTestId("owner-clients-gate")).toHaveAttribute("data-can-link", "true");
  });
});
