"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { documentOperationsHref, formatMoneyRub } from "@/lib/history-format";
import {
  bonusStatusLabel,
  bonusStatusTone,
  purchaseOrderStatusLabel,
  purchaseOrderStatusTone,
  purchaseRowDateLabel,
} from "@/lib/history-labels";
import {
  findAccrualsForPurchase,
  findPurchaseById,
  findPurchaseByOrderId,
} from "@/lib/history-links";
import { fetchHistoryData } from "@/lib/history-loader";
import type { AccrualRow, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./history.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PurchaseDetailProps = {
  user: AuthUser;
  purchaseId: string;
  promoHint?: string;
};

export function PurchaseDetail({ user, purchaseId, promoHint }: PurchaseDetailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchase, setPurchase] = useState<PurchaseRow | null>(null);
  const [linkedAccruals, setLinkedAccruals] = useState<AccrualRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { purchases, accruals } = await fetchHistoryData(user);
      const byOrder = findPurchaseByOrderId(purchases, purchaseId);
      const row = byOrder ?? findPurchaseById(purchases, purchaseId);

      if (!row) {
        setPurchase(null);
        setLinkedAccruals([]);
        return;
      }

      setPurchase(row);
      setLinkedAccruals(findAccrualsForPurchase(row, accruals));
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить операцию",
      );
    } finally {
      setLoading(false);
    }
  }, [user, purchaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>{error}</p>
        <Button onClick={() => void load()}>Повторить</Button>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className={styles.empty}>
        <p>
          Операция не найдена в доступных источниках. Это не означает, что покупка не сохранилась —
          API может не отдавать её в текущих списках.
        </p>
        {promoHint ? (
          <Link href={documentOperationsHref(promoHint)}>
            Все операции по документу {promoHint}
          </Link>
        ) : null}
        <Link href="/history">← К истории</Link>
      </div>
    );
  }

  const orderStatus = purchaseOrderStatusLabel(purchase);

  return (
    <div className={styles.detailCard}>
      <div className={styles.rowHeader}>
        <div>
          {purchase.orderId ? (
            <p className={styles.meta}>Заказ №{purchase.orderId}</p>
          ) : (
            <p className={styles.meta}>Номер заказа недоступен в текущем источнике</p>
          )}
          <h2 className={styles.rowTitle}>{purchase.promoCode ?? "Документ"}</h2>
          <p className={styles.meta}>
            {purchaseRowDateLabel(purchase)}: {formatDate(purchase.createdAt)}
          </p>
        </div>
        {orderStatus ? (
          <StatusBadge label={orderStatus} tone={purchaseOrderStatusTone(purchase)} />
        ) : null}
      </div>

      {purchase.source === "accepted-bonus" ? (
        <p className={styles.note}>
          Данные «Принято у меня» — из списка начислений профклиентам. Полный статус заказа API не
          возвращает.
        </p>
      ) : null}

      <div className={styles.detailGrid}>
        <p className={styles.meta}>
          Направление:{" "}
          {purchase.direction === "accepted" ? "Принято у меня" : "По моей рекомендации"}
        </p>
        <p className={styles.meta}>Партнёр: {purchase.partnerName}</p>
        {purchase.clientName ? <p className={styles.meta}>Клиент: {purchase.clientName}</p> : null}
        {purchase.branchName ? <p className={styles.meta}>Филиал: {purchase.branchName}</p> : null}
        {purchase.isSelfScan ? <p className={styles.meta}>Самосканирование — без начисления</p> : null}
        {purchase.source === "accepted-bonus" && purchase.bonusStatus ? (
          <p className={styles.meta}>
            Статус начисления профклиенту:{" "}
            <StatusBadge
              label={bonusStatusLabel(purchase.bonusStatus)}
              tone={bonusStatusTone(purchase.bonusStatus)}
            />
          </p>
        ) : null}
      </div>

      <div className={styles.amounts}>
        <span>До скидки: {formatMoneyRub(purchase.totalAmount)}</span>
        <span>Скидка: −{formatMoneyRub(purchase.discountAmount)}</span>
        <strong>К оплате: {formatMoneyRub(purchase.payableAmount)}</strong>
        {!purchase.isSelfScan && purchase.proBonus != null && purchase.proBonus > 0 ? (
          <span>Сумма начисления (сохранена): {formatMoneyRub(purchase.proBonus)}</span>
        ) : null}
      </div>

      {purchase.items.length ? (
        <div>
          <h3 className={styles.rowTitle}>Позиции</h3>
          {purchase.items.map((item) => (
            <div key={`${item.categoryLabel}-${item.amount}`} className={styles.itemRow}>
              <strong>{item.categoryLabel}</strong>
              <span className={styles.meta}>Сумма до скидки: {formatMoneyRub(item.amount)}</span>
              {item.issuerPercent != null ? (
                <span className={styles.meta}>
                  Вознаграждение: {item.issuerPercent}% ({formatMoneyRub(item.issuerAmount ?? 0)})
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : purchase.source === "issued-order" ? (
        <p className={styles.note}>Позиции заказа API не возвращает — только суммы.</p>
      ) : null}

      {linkedAccruals.length ? (
        <div>
          <h3 className={styles.rowTitle}>Связанные начисления</h3>
          {linkedAccruals.map((accrual) => (
            <Link
              key={accrual.id}
              href={`/history/accruals/${encodeURIComponent(accrual.id)}`}
              className={styles.row}
              style={{ marginTop: "var(--space-2)" }}
            >
              <div className={styles.rowHeader}>
                <span>{formatMoneyRub(accrual.amount)}</span>
                <StatusBadge
                  label={bonusStatusLabel(accrual.status)}
                  tone={bonusStatusTone(accrual.status)}
                />
              </div>
              <p className={styles.meta}>{formatDate(accrual.createdAt)}</p>
            </Link>
          ))}
        </div>
      ) : purchase.promoCode && !purchase.isSelfScan ? (
        <Link href={documentOperationsHref(purchase.promoCode)}>
          Все операции по документу {purchase.promoCode}
        </Link>
      ) : null}

      <Link href="/history">← К истории</Link>
    </div>
  );
}
