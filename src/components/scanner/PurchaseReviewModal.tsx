"use client";

import { useId } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  buildOrderItems,
  type CategoryAmountDraft,
  type OrderTotals,
} from "@/lib/order-totals";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import {
  defaultRewardDraft,
  formatDaysRu,
  rewardDateHint,
  type RewardConfirmationDraft,
} from "@/lib/reward-confirmation";
import { Button } from "@/components/ui/Button";
import styles from "./purchase-review-modal.module.css";
import { usePurchaseReviewDialogTrap } from "./usePurchaseReviewDialogTrap";

function formatRub(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function lineDiscount(amount: number, discountPercent: number) {
  return Math.round((amount * discountPercent) / 100);
}

export type PurchaseReviewModalProps = {
  open: boolean;
  preview: OrderPreviewAllowed;
  amountDrafts: CategoryAmountDraft;
  rewardDrafts: Record<string, RewardConfirmationDraft>;
  totals: OrderTotals;
  branchLabel: string | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PurchaseReviewModal({
  open,
  preview,
  amountDrafts,
  rewardDrafts,
  totals,
  branchLabel,
  submitting,
  onClose,
  onConfirm,
}: PurchaseReviewModalProps) {
  const titleId = useId();
  const trapRef = usePurchaseReviewDialogTrap(open, onClose);

  if (!open) {
    return null;
  }

  const items = buildOrderItems(preview.availableCategories, amountDrafts);
  const isSelfScan = preview.partner.isSelfScan;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={trapRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="purchase-review-dialog"
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Проверьте покупку
          </h2>
          <div className={styles.totalsHero}>
            <p className={styles.heroDue} data-testid="purchase-review-due">
              К оплате: {formatRub(totals.payableAmount)}
            </p>
            <p className={styles.heroMeta}>
              Сумма покупки {formatRub(totals.totalAmount)} · скидка клиенту{" "}
              {formatRub(totals.totalDiscount)}
            </p>
          </div>
        </header>

        <div
          id="purchase-review-body"
          className={styles.body}
          tabIndex={0}
          data-testid="purchase-review-body"
        >
          <ul className={styles.categoryList}>
            {items.map((item) => {
              const category = preview.availableCategories.find((c) => c.category === item.category);
              const discount = category
                ? lineDiscount(item.amount, category.discountPercent)
                : 0;
              const draft = rewardDrafts[item.category] ?? defaultRewardDraft;
              const kindLabel = draft.kind === "SERVICE" ? "услуга" : "товар";
              const handoff =
                draft.handedOver &&
                (draft.kind === "SERVICE" ? "работы приняты" : "товар передан");
              return (
                <li key={item.category} className={styles.categoryCard}>
                  <p className={styles.categoryTitle}>
                    {displayCategoryLabel(item.category, item.categoryLabel)}
                  </p>
                  <p className={styles.categoryAmounts}>
                    {formatRub(item.amount)} · скидка {formatRub(discount)}
                  </p>
                  {!isSelfScan ? (
                    <p className={styles.categoryQuiet}>
                      {kindLabel}, срок вознаграждения {formatDaysRu(draft.days)}
                      {handoff ? ` · ${handoff}` : ""}
                    </p>
                  ) : null}
                  {!isSelfScan ? (
                    <p className={styles.categoryQuiet}>{rewardDateHint(draft)}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {branchLabel ? (
            <p className={styles.branchFoot}>Филиал операции: {branchLabel}</p>
          ) : null}
          <p className={styles.branchFoot}>
            Партнёр: {preview.partner.storeName}
            {preview.partner.isSelfScan ? " · самосканирование" : ""}
          </p>
        </div>

        <footer className={styles.footer}>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
            data-testid="purchase-review-back"
          >
            Назад
          </Button>
          <Button
            type="button"
            disabled={submitting || totals.totalAmount <= 0}
            onClick={onConfirm}
            data-testid="purchase-review-confirm"
          >
            {submitting ? "Подтверждение…" : "Подтвердить покупку"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
