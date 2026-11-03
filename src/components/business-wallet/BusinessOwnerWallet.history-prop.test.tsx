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
  WalletPrototypeShell: ({ settlements }: { settlements: React.ReactNode }) => settlements,
}));

vi.mock("@/components/profile/agent/AgentPayoutRequisitesPanel", () => ({
  AgentPayoutRequisitesPanel: () => null,
}));

describe("BusinessOwnerWallet history prop chain", () => {
  it("forwards canLinkOnboardingHistory to WalletAccrualsWorkspace", () => {
    render(
      <BusinessOwnerWallet
        partnerType="STORE"
        ownerUserId="owner-1"
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
