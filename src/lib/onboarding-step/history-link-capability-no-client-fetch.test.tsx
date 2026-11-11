import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import type { AuthUser } from "@/lib/types";

const settlementsHubUser: AuthUser = {
  id: "history-link-test",
  role: "PRO",
  partnerType: null,
  displayName: "Test",
};
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import * as historyEligibility from "@/lib/onboarding-step/history-link-eligibility";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn().mockResolvedValue({
    coverageNote: "",
    receivable: [],
    payable: [],
    completed: [],
  }),
  isSettlementsAccessDenied: vi.fn(() => false),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn(),
}));

import { fetchAuthMeSafe } from "@/lib/auth-session";

describe("onboarding history capability — no client fetch for role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(historyEligibility, "canLinkOnboardingHistoryFromUserRole").mockImplementation(() => {
      throw new Error("canLinkOnboardingHistoryFromUserRole must not run in UI for history links");
    });
    vi.mocked(fetchAuthMeSafe).mockResolvedValue({
      ok: true,
      data: { user: { role: "CLIENT" } },
    });
  });

  it("SettlementsHub uses page prop only and never calls fetchAuthMeSafe", async () => {
    render(
      <SettlementsHub
        user={settlementsHubUser}
        walletEmptyViewerRole="store"
        canLinkOnboardingHistory
      />,
    );
    await screen.findByTestId("wallet-empty-state");
    expect(vi.mocked(fetchAuthMeSafe)).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("link", { name: /Подтверждение.*Открыть историю/i }),
    ).toHaveAttribute("href", "/history");
  });

  it("SettlementsHub without prop stays STATIC without fetchAuthMeSafe", async () => {
    render(<SettlementsHub user={settlementsHubUser} walletEmptyViewerRole="store" />);
    await screen.findByTestId("wallet-empty-state");
    expect(vi.mocked(fetchAuthMeSafe)).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).toBeNull();
  });

  it("WalletAccrualsWorkspace links from prop even when fetchAuthMeSafe returns CLIENT", async () => {
    render(
      <WalletAccrualsWorkspace
        walletEmptyViewerRole="store"
        canLinkOnboardingHistory
        scopeKey="test:owner"
      />,
    );
    await screen.findByTestId("wallet-empty-state");
    expect(
      await screen.findByRole("link", { name: /Подтверждение.*Открыть историю/i }),
    ).toHaveAttribute("href", "/history");
  });

  it("WalletAccrualsWorkspace without prop stays STATIC", async () => {
    render(
      <WalletAccrualsWorkspace walletEmptyViewerRole="store" scopeKey="test:owner" />,
    );
    await screen.findByTestId("wallet-empty-state");
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).toBeNull();
  });
});
