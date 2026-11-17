import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture, storeOrgEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/clients/receiving/ReceivingAppealsWorkspace", () => ({
  ReceivingAppealsWorkspace: () => <div data-testid="receiving-workspace" />,
}));
vi.mock("../observer/ObserverPartnersWorkspace", () => ({
  ObserverPartnersWorkspace: () => <div data-testid="observer-workspace" />,
}));
vi.mock("@/lib/clients-parity/fetch-observer-appeals", () => ({ fetchObserverReferredAppeals: vi.fn() }));

const probe = vi.mocked(fetchObserverReferredAppeals);

const employee = {
  id: "emp-1",
  displayName: "Сотрудник",
  role: "CLIENT" as const,
  partnerType: null,
  partnerActivities: [],
};
const assistantContext = {
  role: "PARTNER_EMPLOYEE",
  organization: null,
  branches: [],
  activeBranch: null,
  employer: { id: "spec-1", displayName: "Специалист" },
};

const allowed = { ok: true, appeals: [] } as never;
const denied = { ok: false, code: "FORBIDDEN", message: "Forbidden" } as never;

function renderFor(
  mode: "business" | "specialist",
  proContext: Parameters<typeof cabinetPresentationFixture>[1],
) {
  const value = cabinetPresentationFixture(employee, proContext);
  return render(
    <CabinetPresentationProvider value={value}>
      <ClientsDirectionWorkspace accessMode={mode} />
    </CabinetPresentationProvider>,
  );
}

beforeEach(() => {
  probe.mockReset();
});

describe.each([
  ["org employee", "business" as const, storeOrgEmployeeContext],
  ["specialist's assistant", "specialist" as const, assistantContext],
])("V2: %s and the «у партнёров» direction", (_label, mode, proContext) => {
  it("referred-appeals 200 → the same pair of tabs as the owner", async () => {
    probe.mockResolvedValue(allowed);
    renderFor(mode, proContext);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(2));
    expect(screen.getByTestId("receiving-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("clients-direction-workspace")).toHaveAttribute("data-ca-at-partners", "enabled");
  });

  it("referred-appeals 403 → no tab, no error, only the incoming list", async () => {
    probe.mockResolvedValue(denied);
    renderFor(mode, proContext);
    await waitFor(() =>
      expect(screen.getByTestId("clients-direction-workspace")).toHaveAttribute("data-ca-at-partners", "disabled"),
    );
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/forbidden/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("observer-workspace")).not.toBeInTheDocument();
    expect(screen.getByTestId("receiving-workspace")).toBeInTheDocument();
  });

  it("while the answer is pending the incoming list is already there and no tabs flash", () => {
    probe.mockReturnValue(new Promise(() => {}));
    renderFor(mode, proContext);
    expect(screen.getByTestId("receiving-workspace")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});

describe("V2: owners keep both directions without waiting for the probe", () => {
  it("an owner sees the tabs immediately even if referred-appeals is denied", () => {
    probe.mockResolvedValue(denied);
    renderFor("specialist", { role: "SOLO_PARTNER", organization: null, branches: [], activeBranch: null });
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });
});
