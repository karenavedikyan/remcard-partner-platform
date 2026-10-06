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
import { formatMoneyRub } from "@/lib/history-format";
import {
  ACCEPTED_BONUS_EMPTY_NOTE,
  ACCEPTED_BONUS_SOURCE_NOTE,
  PURCHASE_PERIOD_FILTER_NOTE,
  accrualScopeLabel,
  bonusStatusLabel,
  bonusStatusTone,
  orderStatusLabel,
  purchaseOrderStatusLabel,
  purchaseOrderStatusTone,
  purchaseRowDateLabel,
} from "@/lib/history-labels";
import { purchaseDetailHref, purchaseOrderNumberLabel } from "@/lib/history-links";
import { fetchAcceptedPurchasePage, fetchHistoryData } from "@/lib/history-loader";
import {
  shouldShowAcceptedBonusEmptyNote,
  shouldShowAcceptedBonusLimitation,
  type HistorySourceAvailability,
} from "@/lib/history-sources";
import type { AccrualRow, HistoryFilters, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./history.module.css";

type HistoryTab = "purchases" | "accruals";

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
  const orderStatus = purchaseOrderStatusLabel(row);
  const orderNumber = purchaseOrderNumberLabel(row);

  return (
    <Link href={purchaseDetailHref(row)} className={styles.row}>
      <div className={styles.rowHeader}>
        <div>
          <p className={styles.rowTitle}>
            {row.promoCode ?? "Документ"} · {formatMoneyRub(row.payableAmount)}
          </p>
          <p className={styles.meta}>
            {purchaseRowDateLabel(row)}: {formatDate(row.createdAt)}
            {orderNumber ? ` · №${orderNumber}` : " · № заказа недоступен"} ·{" "}
            {row.direction === "accepted" ? "Принято у меня" : "По моей рекомендации"}
          </p>
        </div>
        {orderStatus ? (
          <StatusBadge label={orderStatus} tone={purchaseOrderStatusTone(row)} />
        ) : null}
      </div>
      <p className={styles.meta}>
        Партнёр: {row.partnerName}
        {row.clientName ? ` · Клиент: ${row.clientName}` : ""}
      </p>
      {row.source === "accepted-bonus" && row.bonusStatus ? (
        <p className={styles.meta}>
          Начисление профклиенту: {bonusStatusLabel(row.bonusStatus)}
        </p>
      ) : null}
      <div className={styles.amounts}>
        <span>До скидки: {formatMoneyRub(row.totalAmount)}</span>
        <span>Скидка: −{formatMoneyRub(row.discountAmount)}</span>
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
          <p className={styles.rowTitle}>{formatMoneyRub(row.amount)}</p>
          <p className={styles.meta}>
            {formatDate(row.createdAt)} · {row.promoCode ?? "Документ"} ·{" "}
            {accrualScopeLabel(row.scope)}
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
  const [sources, setSources] = useState<HistorySourceAvailability>({
    acceptedOrders: false,
    issuedOrders: false,
  });
  const [acceptedNextCursor, setAcceptedNextCursor] = useState<string | null>(null);
  const [loadingMoreAccepted, setLoadingMoreAccepted] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        purchases: purchaseRows,
        accruals: accrualRows,
        sources: sourceFlags,
        acceptedPagination,
      } = await fetchHistoryData(user);

      setAccruals(accrualRows);
      setPurchases(purchaseRows);
      setSources(sourceFlags);
      setAcceptedNextCursor(acceptedPagination?.hasMore ? acceptedPagination.nextCursor : null);
      setHasIssuedPurchases(purchaseRows.some((row) => row.direction === "issued"));
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить историю",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMoreAccepted = useCallback(async () => {
    if (!acceptedNextCursor || loadingMoreAccepted) {
      return;
    }
    setLoadingMoreAccepted(true);
    setError("");
    try {
      const accepted = await fetchAcceptedPurchasePage(acceptedNextCursor);
      setPurchases((prev) => {
        const seen = new Set(prev.map((row) => `${row.direction}-${row.id}`));
        const merged = [...prev];
        for (const row of accepted.purchases) {
          const key = `${row.direction}-${row.id}`;
          if (!seen.has(key)) {
            merged.push(row);
            seen.add(key);
          }
        }
        return merged.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
      setAcceptedNextCursor(accepted.pagination.hasMore ? accepted.pagination.nextCursor : null);
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить историю",
      );
    } finally {
      setLoadingMoreAccepted(false);
    }
  }, [acceptedNextCursor, loadingMoreAccepted]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filteredPurchases = useMemo(() => filterPurchases(purchases, filters), [purchases, filters]);
  const filteredAccruals = useMemo(() => filterAccruals(accruals, filters), [accruals, filters]);
  const purchaseStatuses = useMemo(() => purchaseStatusOptions(purchases), [purchases]);
  const accrualStatuses = useMemo(() => accrualStatusOptions(accruals), [accruals]);

  const directionFilterVisible =
    sources.acceptedOrders && sources.issuedOrders && hasIssuedPurchases;
  const acceptedRowCount = purchases.filter((row) => row.direction === "accepted").length;
  const showAcceptedLimitation = shouldShowAcceptedBonusLimitation(sources);
  const showAcceptedEmptyNote = shouldShowAcceptedBonusEmptyNote(
    sources,
    acceptedRowCount,
    loading,
    Boolean(error),
  );

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
        Поиск и фильтры — по загруженным записям. «Принято у меня» подгружается постранично;
        «По рекомендациям» — до 200 последних заказов.
      </p>

      {showAcceptedLimitation ? <p className={styles.note}>{ACCEPTED_BONUS_SOURCE_NOTE}</p> : null}

      {tab === "purchases" ? (
        <p className={styles.note}>{PURCHASE_PERIOD_FILTER_NOTE}</p>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <TextField
            label="Поиск"
            placeholder="Код документа или номер заказа"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          <TextField
            label={tab === "purchases" ? "Статус заказа" : "Статус начисления"}
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            list="history-status-options"
          />
          <datalist id="history-status-options">
            {(tab === "purchases" ? purchaseStatuses : accrualStatuses).map((status) => (
              <option key={status} value={status}>
                {tab === "purchases" ? orderStatusLabel(status) : bonusStatusLabel(status)}
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

      {!loading && !error && tab === "purchases" && showAcceptedEmptyNote ? (
        <p className={styles.note}>{ACCEPTED_BONUS_EMPTY_NOTE}</p>
      ) : null}

      {!loading && !error && tab === "purchases" ? (
        filteredPurchases.length ? (
          <>
            <div className={styles.list}>
              {filteredPurchases.map((row) => (
                <PurchaseRowCard key={`${row.direction}-${row.id}`} row={row} />
              ))}
            </div>
            {acceptedNextCursor ? (
              <div style={{ marginTop: "var(--space-3)" }}>
                <Button
                  variant="secondary"
                  onClick={() => void loadMoreAccepted()}
                  disabled={loadingMoreAccepted}
                >
                  {loadingMoreAccepted ? "Загрузка…" : "Показать ещё"}
                </Button>
              </div>
            ) : null}
          </>
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
