import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/clients/receiving/ReceivingAppealsWorkspace", () => ({
  ReceivingAppealsWorkspace: () => <div data-testid="receiving-workspace" />,
}));
vi.mock("../observer/ObserverPartnersWorkspace", () => ({
  ObserverPartnersWorkspace: () => <div data-testid="observer-workspace" />,
}));
vi.mock("@/lib/clients-parity/fetch-observer-appeals", () => ({
  fetchObserverReferredAppeals: vi.fn(async () => ({ ok: true, appeals: [] })),
}));

const user = {
  id: "asst-1",
  displayName: "Помощник",
  role: "CLIENT" as const,
  partnerType: null,
  partnerActivities: [],
};

function renderFor(proContext: Parameters<typeof cabinetPresentationFixture>[1]) {
  const value = cabinetPresentationFixture(user, proContext);
  return render(
    <CabinetPresentationProvider value={value}>
      <ClientsDirectionWorkspace accessMode="specialist" />
    </CabinetPresentationProvider>,
  );
}

describe("B3: the specialist's assistant sees the incoming appeals only", () => {
  it("renders the receiving workspace without the referral tab", () => {
    renderFor({
      role: "PARTNER_EMPLOYEE",
      organization: null,
      branches: [],
      activeBranch: null,
      employer: { id: "spec-1", displayName: "Специалист" },
    });
    expect(screen.getByTestId("clients-assistant-receiving-only")).toBeInTheDocument();
    expect(screen.getByTestId("receiving-workspace")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("observer-workspace")).not.toBeInTheDocument();
  });

  it("the specialist himself keeps both directions", () => {
    renderFor({ role: "SOLO_PARTNER", organization: null, branches: [], activeBranch: null });
    expect(screen.queryByTestId("clients-assistant-receiving-only")).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(2);
  });
});
