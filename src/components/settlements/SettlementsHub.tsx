"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import { bonusStatusLabel, bonusStatusTone } from "@/lib/history-labels";
import { fetchSettlements, isSettlementsAccessDenied } from "@/lib/settlements-loader";
import {
  completedDirectionLabel,
  groupObligationsByCounterparty,
  sumObligationAmounts,
} from "@/lib/settlements-mappers";
import {
  settlementAccrualHref,
  settlementPurchaseHref,
} from "@/lib/settlements-links";
import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
  SettlementsResponse,
  SettlementsTab,
} from "@/lib/settlements-types";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./settlements.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TAB_ITEMS: Array<{ id: SettlementsTab; label: string }> = [
  { id: "receivable", label: "Мне должны" },
  { id: "payable", label: "Я должен" },
  { id: "completed", label: "Завершённые" },
];

function ObligationRow({ row }: { row: SettlementObligation }) {
  return (
    <article className={styles.row}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.rowTitle}>{formatMoneyRub(row.amount)}</p>
          <p className={styles.meta}>{row.basis}</p>
        </div>
        <StatusBadge label={bonusStatusLabel(row.status)} tone={bonusStatusTone(row.status)} />
      </div>
      <p className={styles.meta}>Создано: {formatDate(row.createdAt)}</p>
      <div className={styles.actions}>
        <Link href={settlementAccrualHref(row)} className={styles.linkButton}>
          Начисление
        </Link>
        <Link href={settlementPurchaseHref(row)} className={styles.linkButton}>
          Покупка
        </Link>
      </div>
    </article>
  );
}

function PartnerGroupBlock({ group }: { group: SettlementPartnerGroup }) {
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <p className={styles.groupTitle}>{group.counterpartyName}</p>
        <p className={styles.groupTotal}>Итого: {formatMoneyRub(group.totalAmount)}</p>
      </div>
      <div className={styles.list}>
        {group.items.map((row) => (
          <ObligationRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}

function CompletedRow({ row }: { row: SettlementCompleted }) {
  return (
    <Link href={settlementAccrualHref(row)} className={styles.row}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.rowTitle}>{formatMoneyRub(row.amount)}</p>
          <p className={styles.meta}>
            {row.counterpartyName} · {row.basis}
          </p>
        </div>
        <StatusBadge label={completedDirectionLabel(row.direction)} tone="active" />
      </div>
      <p className={styles.meta}>
        Оплачено: {formatDate(row.paidAt)} · {bonusStatusLabel(row.status)}
      </p>
    </Link>
  );
}

export function SettlementsHub() {
  const [tab, setTab] = useState<SettlementsTab>("receivable");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [data, setData] = useState<SettlementsResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      const response = await fetchSettlements();
      setData(response);
    } catch (caught) {
      setData(null);
      if (isSettlementsAccessDenied(caught)) {
        setAccessDenied(true);
        return;
      }
      setError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось загрузить взаиморасчёты",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const receivableGroups = useMemo(
    () => groupObligationsByCounterparty(data?.receivable ?? []),
    [data?.receivable],
  );
  const payableGroups = useMemo(
    () => groupObligationsByCounterparty(data?.payable ?? []),
    [data?.payable],
  );

  const receivableTotal = sumObligationAmounts(data?.receivable ?? []);
  const payableTotal = sumObligationAmounts(data?.payable ?? []);

  if (loading) {
    return <div className={styles.loading}>Загружаем взаиморасчёты…</div>;
  }

  if (accessDenied) {
    return (
      <div className={styles.error} role="alert">
        <p>Раздел взаиморасчётов недоступен для этого аккаунта.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>{error}</p>
        <Button type="button" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.error} role="alert">
        <p>Не удалось загрузить взаиморасчёты.</p>
        <Button type="button" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className={styles.note}>
        Учёт обязательств между партнёрами по сохранённым начислениям. Это не банковский
        баланс — только просмотр открытых и завершённых взаиморасчётов.
      </p>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Мне должны</p>
          <p className={styles.summaryValue}>{formatMoneyRub(receivableTotal)}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Я должен</p>
          <p className={styles.summaryValue}>{formatMoneyRub(payableTotal)}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Завершённые</p>
          <p className={styles.summaryValue}>{data.completed.length}</p>
        </div>
      </div>

      <Tabs items={TAB_ITEMS} active={tab} onChange={setTab} />

      {tab === "receivable" ? (
        receivableGroups.length === 0 ? (
          <div className={styles.empty}>Открытых начислений «мне должны» нет.</div>
        ) : (
          <div className={styles.list}>
            {receivableGroups.map((group) => (
              <PartnerGroupBlock key={group.counterpartyId} group={group} />
            ))}
          </div>
        )
      ) : null}

      {tab === "payable" ? (
        payableGroups.length === 0 ? (
          <div className={styles.empty}>Открытых обязательств «я должен» нет.</div>
        ) : (
          <div className={styles.list}>
            {payableGroups.map((group) => (
              <PartnerGroupBlock key={group.counterpartyId} group={group} />
            ))}
          </div>
        )
      ) : null}

      {tab === "completed" ? (
        data.completed.length === 0 ? (
          <div className={styles.empty}>Завершённых взаиморасчётов пока нет.</div>
        ) : (
          <div className={styles.list}>
            {data.completed.map((row) => (
              <CompletedRow key={`${row.id}-${row.paidAt}`} row={row} />
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
