import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyAuthUser,
  fixtureSergeyOrgEmployeeContext,
} from "@/lib/employee-workspace-data/fixtures";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { AccrualDetail, deriveCanRecordAccrualPayout } from "./AccrualDetail";
import type { AccrualRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const profUser: AuthUser = {
  id: "prof-1",
  role: "PRO",
  partnerType: null,
  displayName: "PROF",
};

const ownerUser: AuthUser = {
  id: "pro-optovik-owner",
  role: "PRO",
  partnerType: "COMPANY",
  displayName: "Owner",
};

const bonusRow: AccrualRow = {
  id: "shared-id",
  orderId: "order-bonus",
  accrualType: "bonus",
  createdAt: "2026-10-01T10:00:00.000Z",
  amount: 100,
  status: "CONFIRMED",
  paidAt: null,
  counterpartyName: "Shop",
  promoCode: "RC-1",
  isSelfScan: false,
  walletRole: "MASTER",
  scope: "earned",
  items: [],
};

const payableBonusRow: AccrualRow = {
  ...bonusRow,
  scope: "payable-to-pros",
  walletRole: null,
};

const agentRow: AccrualRow = {
  ...bonusRow,
  orderId: "order-agent",
  accrualType: "agentBonus",
  amount: 200,
};

vi.mock("@/lib/history-loader", () => ({
  fetchAccrualById: vi.fn(),
  fetchPurchaseByOrderId: vi.fn(),
  fetchPurchaseRows: vi.fn(),
}));

vi.mock("@/lib/payout-record", () => ({
  fetchBonusPayoutActions: vi.fn(),
}));

import { fetchAccrualById, fetchPurchaseByOrderId } from "@/lib/history-loader";
import { fetchBonusPayoutActions } from "@/lib/payout-record";

function staffWithPayoutGrants(): ProContextSnapshot {
  const effectivePermissions = flagsFromActionIds(["own", "ledger", "cash"]);
  return {
    ...fixtureSergeyOrgEmployeeContext({ canViewWallet: true }),
    effectivePermissions,
    branchAssignments: [
      {
        branchId: "branch-optovik-main",
        status: "ACTIVE",
        effectivePermissions,
      },
    ],
  };
}

function renderWithPresentation(
  ui: React.JSX.Element,
  user: AuthUser,
  proContext: ProContextSnapshot | null,
  contextReady: boolean,
) {
  const value = cabinetPresentationFixture(user, proContext, contextReady);
  return render(<CabinetPresentationProvider value={value}>{ui}</CabinetPresentationProvider>);
}

describe("AccrualDetail accrualType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPurchaseByOrderId).mockResolvedValue(null);
    vi.mocked(fetchBonusPayoutActions).mockResolvedValue({
      canRecordCash: true,
      canRecordTransfer: false,
    });
  });

  it("loads bonus and agentBonus separately for shared test id", async () => {
    vi.mocked(fetchAccrualById).mockImplementation(async (_id, type) => {
      if (type === "bonus") return bonusRow;
      if (type === "agentBonus") return agentRow;
      return null;
    });

    const { rerender } = render(
      <AccrualDetail user={profUser} accrualId="shared-id" accrualType="bonus" />,
    );
    expect(await screen.findByText("100")).toBeInTheDocument();
    expect(screen.getByText("₽")).toBeInTheDocument();
    expect(fetchAccrualById).toHaveBeenCalledWith("shared-id", "bonus");

    rerender(
      <AccrualDetail user={profUser} accrualId="shared-id" accrualType="agentBonus" />,
    );
    expect(await screen.findByText("200")).toBeInTheDocument();
    expect(screen.getAllByText("₽").length).toBeGreaterThan(0);
    expect(fetchAccrualById).toHaveBeenCalledWith("shared-id", "agentBonus");
  });
});

describe("AccrualDetail payout affordance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPurchaseByOrderId).mockResolvedValue(null);
    vi.mocked(fetchAccrualById).mockResolvedValue(payableBonusRow);
    vi.mocked(fetchBonusPayoutActions).mockResolvedValue({
      canRecordCash: true,
      canRecordTransfer: false,
    });
  });

  it("fails closed while cabinet context is pending", async () => {
    const pending = cabinetPresentationFixture(
      ownerUser,
      fixtureOptovikOwnerProContext(),
      false,
    );
    expect(deriveCanRecordAccrualPayout(ownerUser, pending)).toBe(false);

    renderWithPresentation(
      <AccrualDetail user={ownerUser} accrualId="pay-1" accrualType="bonus" />,
      ownerUser,
      fixtureOptovikOwnerProContext(),
      false,
    );
    await screen.findByText("100");
    expect(fetchBonusPayoutActions).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Зафиксировать выплату" })).toBeNull();
  });

  it("does not request payout actions for ledger-only org staff", async () => {
    const staff = fixtureSergeyAuthUser();
    renderWithPresentation(
      <AccrualDetail user={staff} accrualId="pay-1" accrualType="bonus" />,
      staff,
      fixtureSergeyOrgEmployeeContext({ canViewWallet: true }),
      true,
    );
    await screen.findByText("100");
    await waitFor(() => expect(fetchBonusPayoutActions).not.toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Зафиксировать выплату" })).toBeNull();
  });

  it("shows payout control for org owner when server returns actions", async () => {
    renderWithPresentation(
      <AccrualDetail user={ownerUser} accrualId="pay-1" accrualType="bonus" />,
      ownerUser,
      fixtureOptovikOwnerProContext(),
      true,
    );
    await screen.findByText("100");
    await waitFor(() => expect(fetchBonusPayoutActions).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Зафиксировать выплату" })).toBeVisible();
  });

  it("shows payout control for org staff with explicit cash grant", async () => {
    const staff = fixtureSergeyAuthUser();
    renderWithPresentation(
      <AccrualDetail user={staff} accrualId="pay-1" accrualType="bonus" />,
      staff,
      staffWithPayoutGrants(),
      true,
    );
    await screen.findByText("100");
    await waitFor(() => expect(fetchBonusPayoutActions).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Зафиксировать выплату" })).toBeVisible();
  });

  it("hides payout affordance after cabinet context becomes invalid", async () => {
    const ownerContext = fixtureOptovikOwnerProContext();
    const validPresentation = cabinetPresentationFixture(ownerUser, ownerContext, true);
    const invalidPresentation = cabinetPresentationFixture(
      ownerUser,
      {
        ...ownerContext,
        organization: {
          ...ownerContext.organization!,
          name: "",
        },
      },
      true,
    );
    expect(deriveCanRecordAccrualPayout(ownerUser, validPresentation)).toBe(true);
    expect(deriveCanRecordAccrualPayout(ownerUser, invalidPresentation)).toBe(false);

    const { rerender } = render(
      <CabinetPresentationProvider value={validPresentation}>
        <AccrualDetail user={ownerUser} accrualId="pay-1" accrualType="bonus" />
      </CabinetPresentationProvider>,
    );
    await screen.findByText("100");
    expect(await screen.findByRole("button", { name: "Зафиксировать выплату" })).toBeVisible();

    rerender(
      <CabinetPresentationProvider value={invalidPresentation}>
        <AccrualDetail user={ownerUser} accrualId="pay-1" accrualType="bonus" />
      </CabinetPresentationProvider>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Зафиксировать выплату" })).toBeNull(),
    );
  });
});
