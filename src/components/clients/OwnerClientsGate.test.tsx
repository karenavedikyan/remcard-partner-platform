import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OwnerClientsGate } from "./OwnerClientsGate";
import { useBusinessSectionDispatch } from "@/lib/business-workplace/use-business-section-dispatch";

vi.mock("@/lib/business-workplace/use-business-section-dispatch");
vi.mock("@/components/layout/CabinetPresentationContext", () => ({
  useCabinetPresentation: () => null,
}));

describe("OwnerClientsGate dispatch", () => {
  it("renders children in business mode for org employee workplace", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: { kind: "business", partnerType: "STORE" },
    });
    render(
      <OwnerClientsGate>
        <div data-testid="clients-child" />
      </OwnerClientsGate>,
    );
    expect(screen.getByTestId("clients-child")).toBeTruthy();
  });

  it("routes PRO owner to agent mode when dispatch selects r03", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: { kind: "agent-r03" },
    });
    render(
      <OwnerClientsGate>
        <div data-testid="agent-clients-child" />
      </OwnerClientsGate>,
    );
    expect(screen.getByTestId("agent-clients-child")).toBeTruthy();
  });

  it("shows honest unavailable state when business and agent paths do not apply", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: null,
    });
    render(
      <OwnerClientsGate>
        <div data-testid="hidden" />
      </OwnerClientsGate>,
    );
    expect(screen.getByText(/недоступен для текущего кабинета/i)).toBeTruthy();
    expect(screen.queryByTestId("hidden")).toBeNull();
  });
});
