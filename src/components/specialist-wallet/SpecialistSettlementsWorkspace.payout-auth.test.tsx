import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import {
  fixtureOptovikOwnerProContext,
  fixtureSergeyAuthUser,
  fixtureSergeyOrgEmployeeContext,
} from "@/lib/employee-workspace-data/fixtures";
import type { AuthUser } from "@/lib/types";
import { SpecialistSettlementsWorkspace } from "./SpecialistSettlementsWorkspace";

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

vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({
  RewardLifecyclePanel: () => null,
}));

const payableFixture = {
  coverageNote: "",
  receivable: [] as const,
  payable: [
    {
      id: "bonus-gate-1",
      orderId: "order-gate-1",
      accrualType: "bonus" as const,
      counterpartyId: "cp-1",
      counterpartyName: "Partner One",
      amount: 1200,
      basis: "Сертификат RC-GATE",
      status: "CONFIRMED" as const,
      createdAt: "2026-10-01T10:00:00.000Z",
      payoutActions: { canRecordCash: true, canRecordTransfer: false },
    },
  ],
  completed: [] as const,
};

async function openPayablePayoutRow(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByTestId("specialist-settlements-workspace");
  await user.click(screen.getByTestId("specialist-wallet-payable-total"));
  await user.click(screen.getByTestId("specialist-partner-group-cp-1"));
}

describe("SpecialistSettlementsWorkspace payout auth", () => {
  it("hides payout control for ledger-only org staff when server sent payoutActions", async () => {
    const staff = fixtureSergeyAuthUser();
    const presentation = cabinetPresentationFixture(
      staff,
      fixtureSergeyOrgEmployeeContext({ canViewWallet: true }),
      true,
    );
    const user = userEvent.setup();
    render(
      <CabinetPresentationProvider value={presentation}>
        <SpecialistSettlementsWorkspace user={staff} previewData={payableFixture} />
      </CabinetPresentationProvider>,
    );
    await openPayablePayoutRow(user);
    expect(screen.queryByTestId("specialist-settlements-record-payout-bonus-gate-1")).toBeNull();
  });

  it("shows payout control for org owner when server sent payoutActions", async () => {
    const presentation = cabinetPresentationFixture(
      ownerUser,
      fixtureOptovikOwnerProContext(),
      true,
    );
    const user = userEvent.setup();
    render(
      <CabinetPresentationProvider value={presentation}>
        <SpecialistSettlementsWorkspace user={ownerUser} previewData={payableFixture} />
      </CabinetPresentationProvider>,
    );
    await openPayablePayoutRow(user);
    expect(await screen.findByTestId("specialist-settlements-record-payout-bonus-gate-1")).toBeInTheDocument();
  });

  it("keeps payout control without cabinet provider (legacy personal shell)", async () => {
    const user = userEvent.setup();
    render(<SpecialistSettlementsWorkspace user={profUser} previewData={payableFixture} />);
    await openPayablePayoutRow(user);
    expect(await screen.findByTestId("specialist-settlements-record-payout-bonus-gate-1")).toBeInTheDocument();
  });
});
