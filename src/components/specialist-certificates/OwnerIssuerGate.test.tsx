import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OwnerIssuerGate } from "./OwnerIssuerGate";
import { useBusinessSectionDispatch } from "@/lib/business-workplace/use-business-section-dispatch";

vi.mock("@/lib/business-workplace/use-business-section-dispatch");
vi.mock("@/components/layout/CabinetPresentationContext", () => ({
  useCabinetPresentation: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/certificates",
  useSearchParams: () => new URLSearchParams(),
}));

describe("OwnerIssuerGate dispatch", () => {
  it("renders children in business mode for org staff workplace", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: { kind: "business", partnerType: "COMPANY" },
    });
    render(
      <OwnerIssuerGate>
        <div data-testid="issuer-child" />
      </OwnerIssuerGate>,
    );
    expect(screen.getByTestId("issuer-child")).toBeTruthy();
  });

  it("shows loading while agent r03 redirect is pending", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: { kind: "agent-r03" },
    });
    render(
      <OwnerIssuerGate>
        <div data-testid="issuer-hidden" />
      </OwnerIssuerGate>,
    );
    expect(screen.getByText(/Загрузка/i)).toBeTruthy();
    expect(screen.queryByTestId("issuer-hidden")).toBeNull();
  });

  it("falls back to legacy issuer shell when dispatch says so", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: { kind: "legacy-issuer" },
    });
    render(
      <OwnerIssuerGate>
        <div data-testid="legacy-issuer-child" />
      </OwnerIssuerGate>,
    );
    expect(screen.getByTestId("legacy-issuer-child")).toBeTruthy();
  });
});
