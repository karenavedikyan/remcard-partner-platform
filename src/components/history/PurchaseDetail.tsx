"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchHistoryData } from "@/lib/history-loader";
import {
  bonusStatusLabel,
  bonusStatusTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/history-labels";
import { findAccrualsForPurchase, findPurchaseByOrderHint } from "@/lib/history-mappers";
import type { AccrualRow, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./history.module.css";

function formatRub(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

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
      const row =
        findPurchaseByOrderHint(purchases, { orderId: purchaseId, promoCode: promoHint }) ??
        findPurchaseByOrderHint(purchases, { promoCode: purchaseId });
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
  }, [user, purchaseId, promoHint]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = useMemo(() => {
    if (!purchase) {
      return "";
    }
    if (purchase.bonusStatus) {
      return bonusStatusLabel(purchase.bonusStatus);
    }
    return orderStatusLabel(purchase.orderStatus);
  }, [purchase]);

  const statusTone = useMemo(() => {
    if (!purchase) {
      return "neutral" as const;
    }
    if (purchase.bonusStatus) {
      return bonusStatusTone(purchase.bonusStatus);
    }
    return orderStatusTone(purchase.orderStatus);
  }, [purchase]);

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
        <p>Операция не найдена среди доступных записей.</p>
        <Link href="/history">Вернуться к истории</Link>
      </div>
    );
  }

  const operationNumber = purchase.orderId ?? purchase.id;

  return (
    <div className={styles.detailCard}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.meta}>Операция #{operationNumber}</p>
          <h2 className={styles.rowTitle}>{purchase.promoCode ?? "Документ"}</h2>
          <p className={styles.meta}>{formatDate(purchase.createdAt)}</p>
        </div>
        <StatusBadge label={statusLabel} tone={statusTone} />
      </div>

      <div className={styles.detailGrid}>
        <p className={styles.meta}>
          Направление:{" "}
          {purchase.direction === "accepted" ? "Принято у меня" : "По моей рекомендации"}
        </p>
        <p className={styles.meta}>Партнёр: {purchase.partnerName}</p>
        {purchase.clientName ? <p className={styles.meta}>Клиент: {purchase.clientName}</p> : null}
        {purchase.branchName ? <p className={styles.meta}>Филиал: {purchase.branchName}</p> : null}
        {purchase.isSelfScan ? <p className={styles.meta}>Самосканирование — без начисления</p> : null}
      </div>

      <div className={styles.amounts}>
        <span>До скидки: {formatRub(purchase.totalAmount)}</span>
        <span>Скидка: −{formatRub(purchase.discountAmount)}</span>
        <strong>К оплате: {formatRub(purchase.payableAmount)}</strong>
        {!purchase.isSelfScan && purchase.proBonus != null && purchase.proBonus > 0 ? (
          <span>Вознаграждение PROF (сохранено): {formatRub(purchase.proBonus)}</span>
        ) : null}
      </div>

      {purchase.items.length ? (
        <div>
          <h3 className={styles.rowTitle}>Позиции</h3>
          {purchase.items.map((item) => (
            <div key={`${item.categoryLabel}-${item.amount}`} className={styles.itemRow}>
              <strong>{item.categoryLabel}</strong>
              <span className={styles.meta}>Сумма до скидки: {formatRub(item.amount)}</span>
              {item.discountPercent != null ? (
                <span className={styles.meta}>Скидка: {item.discountPercent}%</span>
              ) : null}
              {item.issuerPercent != null ? (
                <span className={styles.meta}>
                  Вознаграждение: {item.issuerPercent}% ({formatRub(item.issuerAmount ?? 0)})
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : purchase.direction === "issued" ? (
        <p className={styles.note}>
          Позиции по заказам из /api/pro/orders API не возвращает — только суммы заказа.
        </p>
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
                <span>{formatRub(accrual.amount)}</span>
                <StatusBadge
                  label={bonusStatusLabel(accrual.status)}
                  tone={bonusStatusTone(accrual.status)}
                />
              </div>
              <p className={styles.meta}>{formatDate(accrual.createdAt)}</p>
            </Link>
          ))}
        </div>
      ) : !purchase.isSelfScan && purchase.direction === "accepted" ? (
        <p className={styles.note}>
          Связанное начисление может отображаться у партнёра-рекомендателя; в вашем кошельке записи
          нет.
        </p>
      ) : null}

      <Link href="/history">← К истории</Link>
    </div>
  );
}
