"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CertificatePurchase } from "@/lib/certificate-types";
import { remcardFetch } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import { mapPurchaseAccrualReceiptView } from "@/lib/purchase-accrual-receipt-view";
import type { RewardResponse } from "@/lib/reward-lifecycle-types";
import { Button } from "@/components/ui/Button";
import { usePurchaseReviewDialogTrap } from "@/components/scanner/usePurchaseReviewDialogTrap";
import styles from "./purchase-accrual-receipt.module.css";

export type PurchaseAccrualReceiptModalProps = {
  open: boolean;
  order: CertificatePurchase;
  promoCode: string;
  clientName?: string | null;
  onClose: () => void;
};

type RewardCache = {
  orderId: string;
  reward: RewardResponse | null;
  loaded: boolean;
};

export function selectRewardForOrder(cache: RewardCache | null, orderId: string): RewardCache {
  if (!cache || cache.orderId !== orderId) {
    return { orderId, reward: null, loaded: false };
  }
  return cache;
}

export function PurchaseAccrualReceiptModal({
  open,
  order,
  promoCode,
  clientName,
  onClose,
}: PurchaseAccrualReceiptModalProps) {
  const titleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const trapRef = usePurchaseReviewDialogTrap(open, onClose);
  const [rewardCache, setRewardCache] = useState<RewardCache | null>(null);
  const loadVersion = useRef(0);

  useLayoutEffect(() => {
    if (!open) return;
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = 0;
  }, [open, order.id]);

  useEffect(() => {
    if (!open) return;
    const orderId = order.id;
    const version = ++loadVersion.current;

    if (order.isSelfScan) {
      setRewardCache({ orderId, reward: null, loaded: true });
      return undefined;
    }

    setRewardCache({ orderId, reward: null, loaded: false });

    void (async () => {
      try {
        const response = await remcardFetch<RewardResponse>(
          `/api/pro/wallet/order-rewards/${encodeURIComponent(orderId)}`,
        );
        if (version !== loadVersion.current) return;
        setRewardCache({ orderId, reward: response, loaded: true });
      } catch {
        if (version !== loadVersion.current) return;
        setRewardCache({ orderId, reward: null, loaded: true });
      }
    })();

    return () => {
      loadVersion.current += 1;
    };
  }, [open, order.id, order.isSelfScan]);

  if (!open) return null;

  const scoped = selectRewardForOrder(rewardCache, order.id);
  const view = mapPurchaseAccrualReceiptView(order, scoped.reward, scoped.loaded);
  const historyHref = `/history/purchases/${encodeURIComponent(order.id)}?promo=${encodeURIComponent(promoCode)}`;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="purchase-accrual-receipt-dialog"
        data-order-id={order.id}
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            Начисление по сертификату
          </h2>
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>

        <div ref={scrollRef} className={styles.scroll} id="purchase-accrual-receipt-body" tabIndex={-1}>
          <section className={styles.hero} aria-labelledby={`${titleId}-hero`}>
            <p className={styles.heroKicker} id={`${titleId}-hero`}>
              {view.headline}
            </p>
            <p className={styles.heroAmount} data-tone={view.amountTone} aria-live="polite">
              {view.amountText}
            </p>
            <p className={styles.badge}>{view.statusBadge}</p>
            <p className={styles.heroHint}>{view.helperText}</p>
            {view.showBreakdown && view.breakdown ? (
              <dl className={styles.facts}>
                <dt>Всего по вам</dt>
                <dd>{formatMoneyRub(view.breakdown.totalRub)}</dd>
                <dt>Подтверждено</dt>
                <dd>{formatMoneyRub(view.breakdown.confirmedRub)}</dd>
                <dt>Ожидает</dt>
                <dd>{formatMoneyRub(view.breakdown.pendingRub)}</dd>
                <dt>Выплачено</dt>
                <dd>{formatMoneyRub(view.breakdown.paidRub)}</dd>
                {view.breakdown.suspendedRub > 0 ? (
                  <>
                    <dt>Приостановлено</dt>
                    <dd>{formatMoneyRub(view.breakdown.suspendedRub)}</dd>
                  </>
                ) : null}
                {view.breakdown.reviewRub > 0 ? (
                  <>
                    <dt>На сверке</dt>
                    <dd>{formatMoneyRub(view.breakdown.reviewRub)}</dd>
                  </>
                ) : null}
              </dl>
            ) : null}
          </section>

          <div className={styles.cert} aria-label="Контекст сертификата">
            <span className={styles.certMark} aria-hidden="true" />
            <p className={styles.certLine}>
              <span className={styles.certCode}>{promoCode}</span>
              {clientName ? (
                <>
                  <span className={styles.certSep} aria-hidden="true">
                    ·
                  </span>
                  <span>{clientName}</span>
                </>
              ) : null}
            </p>
          </div>

          <section aria-labelledby={`${titleId}-purchase`}>
            <h3 className={styles.sectionTitle} id={`${titleId}-purchase`}>
              Покупка
            </h3>
            <dl className={styles.facts}>
              <dt>Номер</dt>
              <dd>{view.purchaseNumber}</dd>
              <dt>Дата</dt>
              <dd>{view.purchaseDateLabel}</dd>
              <dt>Партнёр</dt>
              <dd>{view.merchantName}</dd>
              <dt>Статус</dt>
              <dd>{view.purchaseStatus}</dd>
            </dl>
            <p className={styles.paidLine}>
              <span className={styles.paidLabel}>Оплачено</span>
              <strong className={styles.paidValue}>{formatMoneyRub(view.paidRub)}</strong>
            </p>
          </section>

          <details className={styles.details}>
            <summary>Подробности покупки</summary>
            <dl className={styles.facts}>
              <dt>До скидки</dt>
              <dd>{formatMoneyRub(order.totalAmount)}</dd>
              <dt>Скидка клиенту</dt>
              <dd>−{formatMoneyRub(order.discountAmount).replace(/\s*₽$/, "")} ₽</dd>
              {view.categoryLines.map((line) => (
                <div key={line.categoryLabel} style={{ display: "contents" }}>
                  <dt>{line.categoryLabel}</dt>
                  <dd>
                    {formatMoneyRub(line.paidRub)} · скидка {formatMoneyRub(line.discountRub)}
                  </dd>
                </div>
              ))}
            </dl>
          </details>

          {view.showCalc ? (
            <details className={styles.details}>
              <summary>Как рассчитано</summary>
              <p className={styles.detailsBody}>
                Суммы по категориям для этого аккаунта (из учёта вознаграждения):
              </p>
              <ul className={styles.detailsBody}>
                {view.calcLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <details className={styles.details}>
            <summary>История начисления</summary>
            {view.lifecycleNote ? <p className={styles.note}>{view.lifecycleNote}</p> : null}
            {view.loading ? <p className={styles.note} role="status">Загружаем статус начисления…</p> : null}
            <ol className={styles.timeline}>
              {view.history.map((event) => (
                <li
                  key={event.label}
                  data-done={event.done ? "true" : "false"}
                  data-pending={event.pending ? "true" : undefined}
                  data-cancelled={event.cancelled ? "true" : undefined}
                >
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <span>{event.label}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>

        <div className={styles.foot}>
          <Button type="button" className={styles.primaryBtn} onClick={onClose}>
            Понятно
          </Button>
          <Link href={historyHref} className={styles.fullLink} onClick={onClose}>
            Полная карточка покупки
          </Link>
        </div>
      </div>
    </div>
  );
}
