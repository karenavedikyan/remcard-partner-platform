"use client";

import { useId } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  buildOrderItems,
  lineDiscountRub,
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
import scannerButtonStyles from "./scanner-control-button.module.css";
import { usePurchaseReviewDialogTrap } from "./usePurchaseReviewDialogTrap";

function formatRub(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
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
        <h2 id={titleId} className={styles.title}>
          Проверьте покупку
        </h2>

        <div
          id="purchase-review-body"
          className={styles.body}
          tabIndex={0}
          role="region"
          aria-label="Детали покупки перед подтверждением"
          data-testid="purchase-review-body"
        >
          <div className={styles.review}>
            <div className={styles.reviewDue}>
              <p className={styles.reviewDueLabel}>К оплате клиентом</p>
              <p className={styles.reviewDueValue} data-testid="purchase-review-due">
                {formatRub(totals.payableAmount)}
              </p>
              <dl className={styles.reviewRollup}>
                <div className={styles.rollupRow}>
                  <dt>Сумма покупки</dt>
                  <dd>{formatRub(totals.totalAmount)}</dd>
                </div>
                <div className={styles.rollupRow}>
                  <dt>Скидка клиенту</dt>
                  <dd>{formatRub(totals.totalDiscount)}</dd>
                </div>
              </dl>
            </div>

            <ul className={styles.categoryList}>
              {items.map((item) => {
                const category = preview.availableCategories.find((c) => c.category === item.category);
                const discount = category
                  ? lineDiscountRub(item.amount, category.discountPercent)
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
                    <dl className={styles.categoryNums}>
                      <div className={styles.rollupRow}>
                        <dt>До скидки</dt>
                        <dd>{formatRub(item.amount)}</dd>
                      </div>
                      <div className={styles.rollupRow}>
                        <dt>Скидка</dt>
                        <dd>{formatRub(discount)}</dd>
                      </div>
                    </dl>
                    {!isSelfScan ? (
                      <ul className={styles.categoryMeta}>
                        <li>
                          {kindLabel}, срок вознаграждения {formatDaysRu(draft.days)}
                          {handoff ? ` · ${handoff}` : ""}
                        </li>
                        <li>{rewardDateHint(draft)}</li>
                      </ul>
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
        </div>

        <footer className={styles.footer}>
          <Button
            type="button"
            variant="secondary"
            className={scannerButtonStyles.controlButton}
            disabled={submitting}
            onClick={onClose}
            data-testid="purchase-review-back"
          >
            Назад
          </Button>
          <Button
            type="button"
            className={scannerButtonStyles.controlButton}
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
