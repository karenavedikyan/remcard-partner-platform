import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import { PartnerCooperationConfirmDialog } from "./PartnerCooperationConfirmDialog";
import type { Partnership } from "@/lib/types";

const partnership: Partnership = {
  id: "qa-p1",
  status: "ACTIVE",
  initiatedBy: "store-1",
  pendingProposedBy: null,
  note: null,
  createdAt: "",
  updatedAt: "",
  storeUserId: "store-1",
  proUserId: "agent-me",
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 10,
      isExcluded: false,
      minMargin: null,
    },
  ],
  storeUser: {
    id: "store-1",
    displayName: "Synthetic Store",
    city: "Краснодар",
    specializations: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
  },
  proUser: {
    id: "agent-me",
    displayName: "Synthetic Agent",
    city: "Краснодар",
    specializations: [],
    storeCategories: [],
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
  },
};

describe("PartnerPartnershipDetailDialog C1 focus ownership", () => {
  it("suspendFocusTrap lets overlying pause confirm keep safe dismiss focus", async () => {
    const onClose = vi.fn();
    const onDismiss = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <>
        <PartnerPartnershipDetailDialog
          partnership={partnership}
          meId="agent-me"
          open
          onClose={onClose}
          onRunAction={() => {}}
          suspendFocusTrap={false}
        />
      </>,
    );

    expect(screen.getByTestId("partner-detail-close")).toHaveFocus();

    rerender(
      <>
        <PartnerPartnershipDetailDialog
          partnership={partnership}
          meId="agent-me"
          open
          onClose={onClose}
          onRunAction={() => {}}
          suspendFocusTrap
        />
        <PartnerCooperationConfirmDialog
          open
          testId="partner-pause-confirm"
          title="Приостановить?"
          body="Статус сменится."
          confirmLabel="Приостановить"
          dismissLabel="Отмена"
          safeAction="dismiss"
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      </>,
    );

    expect(screen.getByTestId("partner-pause-confirm-dismiss")).toHaveFocus();
    expect(screen.getByTestId("partner-detail-close")).not.toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
