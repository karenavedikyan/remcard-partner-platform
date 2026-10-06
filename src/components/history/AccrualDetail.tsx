"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { documentOperationsHref, formatMoneyRub } from "@/lib/history-format";
import {
  accrualScopeLabel,
  bonusStatusLabel,
  bonusStatusTone,
} from "@/lib/history-labels";
import { findAccrualById, findPurchaseForAccrual, purchaseDetailHref } from "@/lib/history-links";
import { fetchAccrualRows, fetchPurchaseByOrderId, fetchPurchaseRows } from "@/lib/history-loader";
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

type AccrualDetailProps = {
  user: AuthUser;
  accrualId: string;
};

export function AccrualDetail({ user, accrualId }: AccrualDetailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accrual, setAccrual] = useState<AccrualRow | null>(null);
  const [linkedPurchase, setLinkedPurchase] = useState<PurchaseRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const accruals = await fetchAccrualRows();
      const row = findAccrualById(accruals, accrualId);
      if (!row) {
        setAccrual(null);
        setLinkedPurchase(null);
        return;
      }
      setAccrual(row);

      if (row.orderId) {
        const byOrderId = await fetchPurchaseByOrderId(row.orderId, user);
        setLinkedPurchase(byOrderId);
        return;
      }

      const purchaseResult = await fetchPurchaseRows(user);
      setLinkedPurchase(findPurchaseForAccrual(row, purchaseResult.purchases));
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить начисление",
      );
    } finally {
      setLoading(false);
    }
  }, [user, accrualId]);

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

  if (!accrual) {
    return (
      <div className={styles.empty}>
        <p>Начисление не найдено среди доступных записей.</p>
        <Link href="/history">← К истории</Link>
      </div>
    );
  }

  return (
    <div className={styles.detailCard}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.meta}>Начисление №{accrual.id}</p>
          <h2 className={styles.rowTitle}>{formatMoneyRub(accrual.amount)}</h2>
          <p className={styles.meta}>
            {formatDate(accrual.createdAt)} · {accrualScopeLabel(accrual.scope)}
          </p>
        </div>
        <StatusBadge
          label={bonusStatusLabel(accrual.status)}
          tone={bonusStatusTone(accrual.status)}
        />
      </div>

      {accrual.scope === "unknown" ? (
        <p className={styles.note}>
          Тип начисления не определён — API не вернул роль кошелька.
        </p>
      ) : null}

      <div className={styles.detailGrid}>
        <p className={styles.meta}>Партнёр: {accrual.counterpartyName}</p>
        {accrual.promoCode ? <p className={styles.meta}>Документ: {accrual.promoCode}</p> : null}
        {accrual.paidAt ? (
          <p className={styles.meta}>Выплачено: {formatDate(accrual.paidAt)}</p>
        ) : null}
      </div>

      {accrual.items.length ? (
        <div>
          <h3 className={styles.rowTitle}>Позиции</h3>
          {accrual.items.map((item, index) => (
            <div key={`${item.categoryLabel}-${index}`} className={styles.itemRow}>
              <strong>{item.categoryLabel}</strong>
              <span className={styles.meta}>
                {item.bonusPercent}% от {formatMoneyRub(item.amount)} →{" "}
                {formatMoneyRub(item.bonusAmount)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {linkedPurchase ? (
        <Link href={purchaseDetailHref(linkedPurchase)}>Открыть связанную покупку</Link>
      ) : accrual.promoCode ? (
        <Link href={documentOperationsHref(accrual.promoCode)}>
          Все операции по документу {accrual.promoCode}
        </Link>
      ) : null}

      <Link href="/history">← К истории</Link>
    </div>
  );
}
