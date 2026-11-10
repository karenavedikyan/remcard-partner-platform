import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAccrualsWorkspace } from "./WalletAccrualsWorkspace";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/wallet-empty/wallet-empty.module.css", () => ({ default: {} }));

vi.mock("@/components/ui/Button.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/FormField.module.css", () => ({ default: {} }));
vi.mock("@/components/payout/payout-record.module.css", () => ({}));

vi.mock("@/components/settlements/reward-lifecycle.module.css", () => ({ default: {} }));

vi.mock("@/components/specialist-wallet/SpecialistSettlementsWorkspace", () => ({
  SpecialistSettlementsWorkspace: () => null,
}));

vi.mock("@/components/agent-r05/AgentReceivablesHub", () => ({
  AgentReceivablesHub: ({ onBack }: { onBack?: () => void }) => (
    <div data-testid="agent-r05-receivables">
      <button type="button" onClick={onBack}>
        back
      </button>
    </div>
  ),
}));

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn(() => false),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn().mockResolvedValue({
    ok: true,
    data: { user: { id: "actor-1", displayName: "Сотрудник", publicId: "RC-ACTOR" } },
  }),
}));

vi.mock("@/lib/agent-r05/api", () => ({
  fetchAgentReceivableOrders: vi.fn(),
  fetchAgentReceivablePartners: vi.fn(),
  fetchAgentReceivablesOverview: vi.fn(),
}));

import { fetchSettlements } from "@/lib/settlements-loader";
import { fetchAgentReceivableOrders, fetchAgentReceivablePartners } from "@/lib/agent-r05/api";

describe("WalletAccrualsWorkspace loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSettlements).mockResolvedValue({
      receivable: [],
      payable: [],
      completed: [],
      coverageNote: "",
    });
  });

  it("loads only settlements API for incoming-only agent shell (no agent-receivables/orders)", async () => {
    render(<WalletAccrualsWorkspace incomingOnly scopeKey="agent-test" fallbackRibbon="Агент" />);
    await screen.findByTestId("wallet-accruals");
    expect(fetchSettlements).toHaveBeenCalledTimes(1);
    expect(fetchAgentReceivablePartners).not.toHaveBeenCalled();
    expect(fetchAgentReceivableOrders).not.toHaveBeenCalled();
  });

  it("staff merged branch ledger uses wallet shell with coverage when slices are empty", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      receivable: [],
      payable: [],
      completed: [],
      coverageNote:
        "Показаны расчёты по филиалам с правом просмотра (2). Исторические начисления без привязки к филиалу не включены. Итог может отличаться от общего баланса владельца.",
      walletReadScope: "org-staff-branches",
    });
    render(
      <WalletAccrualsWorkspace
        walletLedgerBranchIds={["branch-a", "branch-b"]}
        walletEmptyViewerRole="company"
        scopeKey="staff-merged-empty"
      />,
    );
    await screen.findByTestId("wallet-accruals");
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
    expect(screen.getByTestId("wallet-coverage-note")).toHaveTextContent(/филиалам с правом просмотра/i);
  });

  it("company-wide staff empty keeps wallet shell via walletReadScope (not owner onboarding)", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue({
      receivable: [],
      payable: [],
      completed: [],
      coverageNote: "Показаны расчёты организации.",
      walletReadScope: "org-staff-company",
    });
    render(
      <WalletAccrualsWorkspace
        walletEmptyViewerRole="company"
        scopeKey="staff-company-empty"
      />,
    );
    await screen.findByTestId("wallet-accruals");
    expect(screen.queryByTestId("wallet-empty-state")).toBeNull();
    expect(fetchSettlements).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId("wallet-coverage-note")).toHaveTextContent(/организации/i);
    expect(screen.queryByTestId("wallet-coverage-note")).not.toHaveTextContent(
      /без привязки к филиалу/i,
    );
  });

  it("does not show actor publicId on card ribbon (ownership not provable)", async () => {
    render(<WalletAccrualsWorkspace fallbackRibbon="Магазин" />);
    await screen.findByTestId("wallet-rc-receivable-face");
    expect(screen.queryByText("RC ACTOR")).toBeNull();
    expect(screen.getByText("Магазин")).toBeInTheDocument();
  });
});
