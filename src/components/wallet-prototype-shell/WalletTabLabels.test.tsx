import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentReceivablesWallet } from "@/components/agent-r05/AgentReceivablesWallet";
import { BusinessOwnerWallet } from "@/components/business-wallet/BusinessOwnerWallet";
import { SpecialistMasterWallet } from "@/components/specialist-wallet/SpecialistMasterWallet";

vi.mock("@/components/wallet-accruals/WalletAccrualsWorkspace", () => ({
  WalletAccrualsWorkspace: () => <div data-testid="wallet-accruals-workspace" />,
}));

vi.mock("@/components/profile/agent/AgentPayoutRequisitesPanel", () => ({
  AgentPayoutRequisitesPanel: () => null,
}));

describe("wallet settlements tab label", () => {
  afterEach(() => cleanup());

  it("store and company wallets show «Расчёты»", () => {
    for (const partnerType of ["STORE", "COMPANY"] as const) {
      render(
        <BusinessOwnerWallet
          partnerType={partnerType}
          ledgerScopeKey={`${partnerType}:org-1:u-1`}
          canManageRequisites
        />,
      );
      const tab = screen.getAllByRole("tab", { name: "Расчёты" });
      expect(tab.length).toBeGreaterThan(0);
      cleanup();
    }
  });

  it("specialist wallet shows «Расчёты»", () => {
    render(<SpecialistMasterWallet walletScopeKey="specialist:u-1" />);
    expect(screen.getByTestId("specialist-wallet-tab-settlements")).toHaveTextContent("Расчёты");
    expect(screen.queryByText("Взаиморасчёты")).toBeNull();
  });

  it("agent wallet shows «Начисления» and keeps its test ids", () => {
    render(<AgentReceivablesWallet walletScopeKey="agent:u-1" />);
    const tab = screen.getByTestId("agent-r05-tab-settlements");
    expect(tab).toHaveTextContent("Начисления");
    expect(tab).toHaveAttribute("role", "tab");
    expect(screen.getByTestId("agent-r05-tab-requisites")).toHaveTextContent("Реквизиты");
    expect(screen.queryByText("Взаиморасчёты")).toBeNull();
  });
});
