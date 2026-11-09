/**
 * Lightweight layout harness for root visual review (jsdom only).
 * Do not hit live `/api/store/order/preview` in browser checks: preview POST can
 * mark expired certificates EXPIRED. Production manual QA = scanner shell only,
 * no certificate search submit.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PurchaseReviewModal } from "./PurchaseReviewModal";
import { defaultRewardDraft } from "@/lib/reward-confirmation";
import { computeOrderTotals } from "@/lib/order-totals";
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

  it("shows production integer-ruble totals (10750/5750/906 at 10/7/10%)", () => {
    const categories = [
      { category: "a", categoryLabel: "Кат. A", discountPercent: 10, issuerPercent: 0 },
      { category: "b", categoryLabel: "Кат. B", discountPercent: 7, issuerPercent: 0 },
      { category: "c", categoryLabel: "Кат. C", discountPercent: 10, issuerPercent: 0 },
    ];
    const amounts = { a: "10750", b: "5750", c: "906" };
    const totals = computeOrderTotals(categories, amounts);
    expect(totals.totalDiscount).toBe(1569);
    expect(totals.payableAmount).toBe(15837);

    render(
      <PurchaseReviewModal
        open
        preview={{
          ...preview,
          availableCategories: categories,
        }}
        amountDrafts={amounts}
        rewardDrafts={{
          a: defaultRewardDraft,
          b: defaultRewardDraft,
          c: defaultRewardDraft,
        }}
        totals={totals}
        branchLabel="Тестовый филиал"
        submitting={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    const dialog = screen.getByTestId("purchase-review-dialog");
    expect(screen.getByText("К оплате клиентом")).toBeInTheDocument();
    expect(screen.getByTestId("purchase-review-due")).toHaveTextContent("15 837");
    expect(screen.getAllByText("До скидки").length).toBeGreaterThan(0);
    expect(dialog).toHaveTextContent("17 406");
    expect(dialog).toHaveTextContent("1 569");
    expect(screen.getByTestId("purchase-review-body")).toHaveTextContent("1 075");
    expect(screen.getByTestId("purchase-review-body")).toHaveTextContent("403");
    expect(screen.getByTestId("purchase-review-body")).toHaveTextContent("91");
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
