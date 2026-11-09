/**
 * Lightweight layout harness for root visual review (jsdom, no backend).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PurchaseReviewModal } from "./PurchaseReviewModal";
import { defaultRewardDraft } from "@/lib/reward-confirmation";
import type { OrderPreviewAllowed } from "@/lib/order-types";

const preview: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "c",
    promoCode: "А-RC-HARNESS",
    status: "ACTIVE",
    validUntil: "2031-06-01T00:00:00.000Z",
    usageCount: 0,
    maxUsages: 1,
    userAlias: null,
    issuer: { label: "PROF", name: "Harness Issuer" },
  },
  partner: { id: "p", storeName: "Harness Store", isSelfScan: false },
  availableCategories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 12,
      issuerPercent: 4,
    },
  ],
};

describe("PurchaseReviewModal visual harness", () => {
  it("renders desktop totals and wide amount without horizontal overflow markers", () => {
    render(
      <div data-theme="light" style={{ width: 1280 }}>
        <PurchaseReviewModal
          open
          preview={preview}
          amountDrafts={{ doors: "999999999" }}
          rewardDrafts={{ doors: defaultRewardDraft }}
          totals={{
            totalAmount: 999999999,
            totalDiscount: 119999999,
            totalIssuerBonus: 39999999,
            payableAmount: 880000000,
          }}
          branchLabel="Центральный филиал"
          submitting={false}
          onClose={() => undefined}
          onConfirm={() => undefined}
        />
      </div>,
    );

    expect(screen.getByTestId("purchase-review-due")).toHaveTextContent(/880/);
    expect(screen.getByTestId("purchase-review-body")).toHaveTextContent(/999/);
  });

  it("renders narrow mobile shell", () => {
    render(
      <div data-theme="dark" style={{ width: 320 }}>
        <PurchaseReviewModal
          open
          preview={preview}
          amountDrafts={{ doors: "1500" }}
          rewardDrafts={{ doors: { ...defaultRewardDraft, days: "7", handedOver: true } }}
          totals={{
            totalAmount: 1500,
            totalDiscount: 180,
            totalIssuerBonus: 60,
            payableAmount: 1320,
          }}
          branchLabel={null}
          submitting={false}
          onClose={() => undefined}
          onConfirm={() => undefined}
        />
      </div>,
    );

    expect(screen.getByTestId("purchase-review-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("purchase-review-body")).toHaveTextContent(/7 дней/);
  });
});
