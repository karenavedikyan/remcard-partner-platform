"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  accrualStatusOptions,
  DEFAULT_HISTORY_FILTERS,
  filterAccruals,
  filterPurchases,
  purchaseStatusOptions,
} from "@/lib/history-filters";
import {
  bonusStatusLabel,
  bonusStatusTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/history-labels";
import { fetchHistoryData } from "@/lib/history-loader";
import type { AccrualRow, HistoryFilters, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./history.module.css";

type HistoryTab = "purchases" | "accruals";

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

function PurchaseRowCard({ row }: { row: PurchaseRow }) {
  const status = row.bonusStatus ?? row.orderStatus;
  const statusLabel = row.bonusStatus
    ? bonusStatusLabel(row.bonusStatus)
    : orderStatusLabel(row.orderStatus);
  const tone = row.bonusStatus ? bonusStatusTone(row.bonusStatus) : orderStatusTone(row.orderStatus);

  return (
    <Link href={`/history/purchases/${encodeURIComponent(row.id)}`} className={styles.row}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.rowTitle}>
            {row.promoCode ?? "Документ"} · {formatRub(row.payableAmount)}
          </p>
          <p className={styles.meta}>
            {formatDate(row.createdAt)} · №{row.orderId ?? row.id} ·{" "}
            {row.direction === "accepted" ? "Принято у меня" : "По моей рекомендации"}
          </p>
        </div>
        {status ? <StatusBadge label={statusLabel} tone={tone} /> : null}
      </div>
      <p className={styles.meta}>
        Партнёр: {row.partnerName}
        {row.clientName ? ` · Клиент: ${row.clientName}` : ""}
      </p>
      <div className={styles.amounts}>
        <span>До скидки: {formatRub(row.totalAmount)}</span>
        <span>Скидка: −{formatRub(row.discountAmount)}</span>
        {row.isSelfScan ? <span>Самосканирование</span> : null}
      </div>
    </Link>
  );
}

function AccrualRowCard({ row }: { row: AccrualRow }) {
  return (
    <Link href={`/history/accruals/${encodeURIComponent(row.id)}`} className={styles.row}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.rowTitle}>{formatRub(row.amount)}</p>
          <p className={styles.meta}>
            {formatDate(row.createdAt)} · {row.promoCode ?? "Документ"}
          </p>
        </div>
        <StatusBadge label={bonusStatusLabel(row.status)} tone={bonusStatusTone(row.status)} />
      </div>
      <p className={styles.meta}>Партнёр: {row.counterpartyName}</p>
    </Link>
  );
}

type HistoryHubProps = {
  user: AuthUser;
  initialPromoCode?: string;
};

export function HistoryHub({ user, initialPromoCode }: HistoryHubProps) {
  const [tab, setTab] = useState<HistoryTab>("purchases");
  const [filters, setFilters] = useState<HistoryFilters>({
    ...DEFAULT_HISTORY_FILTERS,
    search: initialPromoCode ?? "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [accruals, setAccruals] = useState<AccrualRow[]>([]);
  const [hasIssuedPurchases, setHasIssuedPurchases] = useState(false);
  const [hasAcceptedPurchases, setHasAcceptedPurchases] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { purchases: purchaseRows, accruals: accrualRows } = await fetchHistoryData(user);

      setAccruals(accrualRows);
      setPurchases(purchaseRows);
      setHasAcceptedPurchases(purchaseRows.some((row) => row.direction === "accepted"));
      setHasIssuedPurchases(purchaseRows.some((row) => row.direction === "issued"));
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить историю",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filteredPurchases = useMemo(() => filterPurchases(purchases, filters), [purchases, filters]);
  const filteredAccruals = useMemo(() => filterAccruals(accruals, filters), [accruals, filters]);
  const purchaseStatuses = useMemo(() => purchaseStatusOptions(purchases), [purchases]);
  const accrualStatuses = useMemo(() => accrualStatusOptions(accruals), [accruals]);

  const directionFilterVisible = hasAcceptedPurchases && hasIssuedPurchases;

  return (
    <>
      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { id: "purchases", label: "Покупки", count: filteredPurchases.length || undefined },
          { id: "accruals", label: "Начисления", count: filteredAccruals.length || undefined },
        ]}
      />

      <p className={styles.note}>
        Поиск и фильтры работают по загруженным записям (до 200 заказов по рекомендациям; полный
        список начислений без серверной пагинации).
      </p>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <TextField
            label="Поиск"
            placeholder="Код документа или номер"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          <TextField
            label="Статус"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            list="history-status-options"
          />
          <datalist id="history-status-options">
            {(tab === "purchases" ? purchaseStatuses : accrualStatuses).map((status) => (
              <option key={status} value={status}>
                {bonusStatusLabel(status) !== status
                  ? bonusStatusLabel(status)
                  : orderStatusLabel(status)}
              </option>
            ))}
          </datalist>
          <TextField
            label="С даты"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
          />
          <TextField
            label="По дату"
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
          />
          {directionFilterVisible && tab === "purchases" ? (
            <label className={styles.meta}>
              Направление
              <select
                value={filters.direction}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    direction: event.target.value as HistoryFilters["direction"],
                  }))
                }
                style={{ display: "block", width: "100%", marginTop: "4px" }}
              >
                <option value="all">Все</option>
                <option value="accepted">Принято у меня</option>
                <option value="issued">По моим рекомендациям</option>
              </select>
            </label>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => void loadHistory()} disabled={loading}>
          Повторить
        </Button>
      </div>

      {loading ? <div className={styles.loading}>Загрузка…</div> : null}

      {!loading && error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <Button onClick={() => void loadHistory()}>Повторить</Button>
        </div>
      ) : null}

      {!loading && !error && tab === "purchases" ? (
        filteredPurchases.length ? (
          <div className={styles.list}>
            {filteredPurchases.map((row) => (
              <PurchaseRowCard key={`${row.direction}-${row.id}`} row={row} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Покупок не найдено</div>
        )
      ) : null}

      {!loading && !error && tab === "accruals" ? (
        filteredAccruals.length ? (
          <div className={styles.list}>
            {filteredAccruals.map((row) => (
              <AccrualRowCard key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Начислений не найдено</div>
        )
      ) : null}
    </>
  );
}
