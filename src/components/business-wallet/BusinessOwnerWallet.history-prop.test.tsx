import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessOwnerWallet } from "./BusinessOwnerWallet";

vi.mock("@/components/wallet-accruals/WalletAccrualsWorkspace", () => ({
  WalletAccrualsWorkspace: ({
    canLinkOnboardingHistory,
  }: {
    canLinkOnboardingHistory?: boolean;
  }) => (
    <div
      data-testid="wallet-accruals-workspace"
      data-can-link={String(canLinkOnboardingHistory)}
    />
  ),
}));

vi.mock("@/components/wallet-prototype-shell/WalletPrototypeShell", () => ({
  WalletPrototypeShell: ({
    settlements,
    requisites,
  }: {
    settlements: React.ReactNode;
    requisites: React.ReactNode;
  }) => (
    <div>
      {settlements}
      {requisites}
    </div>
  ),
}));

vi.mock("@/components/profile/agent/AgentPayoutRequisitesPanel", () => ({
  AgentPayoutRequisitesPanel: () => null,
}));

describe("BusinessOwnerWallet history prop chain", () => {
  it("shows blocked requisites for staff without manage rights", () => {
    render(
      <BusinessOwnerWallet
        partnerType="COMPANY"
        ledgerScopeKey="COMPANY:org-2:staff-1"
        canManageRequisites={false}
      />,
    );
    expect(screen.getByTestId("business-wallet-requisites-blocked")).toBeTruthy();
  });

  it("forwards canLinkOnboardingHistory to WalletAccrualsWorkspace", () => {
    render(
      <BusinessOwnerWallet
        partnerType="STORE"
        ledgerScopeKey="STORE:org-1:actor-1"
        walletEmptyViewerRole="store"
        canLinkOnboardingHistory
      />,
    );
    expect(screen.getByTestId("wallet-accruals-workspace")).toHaveAttribute(
      "data-can-link",
      "true",
    );
  });
});
