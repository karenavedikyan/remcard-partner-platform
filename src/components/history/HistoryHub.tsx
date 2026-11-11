"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  accrualStatusOptions,
  DEFAULT_HISTORY_FILTERS,
  filterAccruals,
  filterPurchases,
  purchaseStatusOptions,
} from "@/lib/history-filters";
import { presentAccrualRow } from "@/lib/history-accrual-display";
import { formatMoneyRub } from "@/lib/history-format";
import {
  ACCEPTED_BONUS_EMPTY_NOTE,
  ACCEPTED_BONUS_SOURCE_NOTE,
  ACCEPTED_STORE_ACCESS_DENIED_NOTE,
  FILTERED_PURCHASES_EMPTY_NOTE,
  PURCHASE_PERIOD_FILTER_NOTE,
  accrualScopeLabel,
  bonusStatusLabel,
  bonusStatusTone,
  orderStatusLabel,
  purchaseOrderStatusLabel,
  purchaseOrderStatusTone,
} from "@/lib/history-labels";
import { accrualDetailHref } from "@/lib/accrual-type";
import { purchaseDetailHref } from "@/lib/history-links";
import {
  canPreserveHistoryAcceptedTail,
  fetchAcceptedPurchasePage,
  fetchHistoryData,
  historyAcceptedTailBeyondFreshHead,
  mergeHistoryPurchasesBackground,
} from "@/lib/history-loader";
import {
  shouldShowAcceptedAccessDeniedNote,
  shouldShowAcceptedBonusEmptyNote,
  shouldShowAcceptedBonusLimitation,
  type HistorySourceAvailability,
} from "@/lib/history-sources";
import type { AccrualRow, HistoryFilters, PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import focus from "./history-focus.module.css";
import {
  isWalletRefreshUnauthorized,
  useWalletVisibleRefresh,
  WALLET_STALE_DATA_NOTICE,
  type WalletRefreshReason,
} from "@/lib/wallet-data-refresh";
import { historyActorScopeKey } from "@/lib/settlements-fetch-scope";

type HistoryTab = "purchases" | "accruals";

function formatListDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function purchaseListTitle(row: PurchaseRow): string {
  if (row.source === "accepted-bonus") {
    return "Покупка из истории начислений";
  }
  return row.direction === "issued" ? "Покупка по рекомендации" : "Покупка по сертификату";
}

function accrualListTitle(row: AccrualRow): string {
  if (row.accrualType === "agentBonus") {
    return "Агентское вознаграждение";
  }
  if (row.scope === "payable-to-pros") {
    return "Вознаграждение профклиенту";
  }
  if (row.scope === "earned") {
    return "Начислено мне";
  }
  return accrualScopeLabel(row.scope);
}

function PurchaseRowCard({ row }: { row: PurchaseRow }) {
  const orderStatus = purchaseOrderStatusLabel(row);
  const promo = row.promoCode ?? "Документ";

  return (
    <Link href={purchaseDetailHref(row)} className={focus.operation}>
      <div className={focus.operationMain}>
        <strong>{purchaseListTitle(row)}</strong>
        <p className={focus.rowPartner}>Партнёр: {row.partnerName}</p>
        <p>
          {promo} · {formatListDate(row.createdAt)}
        </p>
      </div>
      <div className={focus.operationMoney}>
        <strong>{formatMoneyRub(row.payableAmount)}</strong>
        <div className={focus.statusLine}>
          {orderStatus ? (
            <StatusBadge label={orderStatus} tone={purchaseOrderStatusTone(row)} />
          ) : row.source === "accepted-bonus" && row.bonusStatus ? (
            <StatusBadge label={bonusStatusLabel(row.bonusStatus)} tone={bonusStatusTone(row.bonusStatus)} />
          ) : (
            <span>{row.isSelfScan ? "Самосканирование" : "—"}</span>
          )}
        </div>
      </div>
      <span className={focus.arrow} aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

function AccrualRowCard({ row }: { row: AccrualRow }) {
  const promo = row.promoCode ?? "Документ";
  const presentation = presentAccrualRow(row);

  return (
    <Link
      href={accrualDetailHref(row.id, row.accrualType)}
      className={focus.operation}
    >
      <div className={focus.operationMain}>
        <strong>{accrualListTitle(row)}</strong>
        <p className={focus.rowPartner}>Партнёр: {row.counterpartyName}</p>
        <p>
          {promo} · {formatListDate(row.createdAt)}
        </p>
      </div>
      <div className={focus.operationMoney}>
        <strong>{formatMoneyRub(presentation.heroAmount)}</strong>
        <div className={focus.statusLine}>
          <StatusBadge label={presentation.statusLabel} tone={presentation.statusTone} />
        </div>
      </div>
      <span className={focus.arrow} aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

type HistoryHubProps = {
  user: AuthUser;
  initialPromoCode?: string;
  /** Server-derived actor scope; should match page remount key. */
  scopeKey?: string;
};

export function HistoryHub({ user, initialPromoCode, scopeKey }: HistoryHubProps) {
  const historyScopeKey =
    scopeKey ?? historyActorScopeKey(user.id, user.role);
  const userRef = useRef(user);
  userRef.current = user;
  const [tab, setTab] = useState<HistoryTab>("purchases");
  const [filters, setFilters] = useState<HistoryFilters>({
    ...DEFAULT_HISTORY_FILTERS,
    search: initialPromoCode ?? "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [loadMoreError, setLoadMoreError] = useState("");
  const [acceptedAccessDenied, setAcceptedAccessDenied] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState("");
  const [backgroundRefreshEnabled, setBackgroundRefreshEnabled] = useState(true);
  const loadGenerationRef = useRef(0);
  const loadScopeRef = useRef(historyScopeKey);
  const loadMoreGenerationRef = useRef(0);
  const hasLoadedDataRef = useRef(false);
  const purchasesRef = useRef<PurchaseRow[]>([]);
  const prevHistoryScopeRef = useRef(historyScopeKey);
  purchasesRef.current = purchases;

  useEffect(() => {
    const scopeChanged = prevHistoryScopeRef.current !== historyScopeKey;
    prevHistoryScopeRef.current = historyScopeKey;
    loadScopeRef.current = historyScopeKey;
    loadGenerationRef.current += 1;
    loadMoreGenerationRef.current += 1;
    setBackgroundRefreshEnabled(true);
    setRefreshNotice("");
    if (scopeChanged) {
      setPurchases([]);
      setAccruals([]);
      setSources({ acceptedOrders: false, issuedOrders: false });
      setHasIssuedPurchases(false);
      setAcceptedNextCursor(null);
      setAcceptedAccessDenied(false);
      setLoadMoreError("");
      setLoadingMoreAccepted(false);
      hasLoadedDataRef.current = false;
      setError("");
      setLoading(true);
    }
  }, [historyScopeKey]);

  const applyHistoryUnauthorized = useCallback(() => {
    loadGenerationRef.current += 1;
    loadMoreGenerationRef.current += 1;
    setBackgroundRefreshEnabled(false);
    setPurchases([]);
    setAccruals([]);
    hasLoadedDataRef.current = false;
    setAcceptedNextCursor(null);
    setLoadingMoreAccepted(false);
    setLoadMoreError("");
    setError("Сессия завершилась. Войдите снова.");
  }, []);

  const loadHistory = useCallback(async (options?: { background?: boolean }) => {
    const scopeAtStart = loadScopeRef.current;
    const generation = ++loadGenerationRef.current;
    const background = Boolean(options?.background);
    const preserveOnError = background && hasLoadedDataRef.current;
    if (!preserveOnError) {
      setError("");
      setAcceptedAccessDenied(false);
    }
    if (!background || !hasLoadedDataRef.current) {
      setLoading(true);
    }

    try {
      const {
        purchases: purchaseRows,
        accruals: accrualRows,
        sources: sourceFlags,
        acceptedPagination,
        acceptedAccessDenied: storeAccessDenied,
      } = await fetchHistoryData(userRef.current);

      if (generation !== loadGenerationRef.current || scopeAtStart !== loadScopeRef.current) {
        return;
      }

      setAccruals(accrualRows);
      const acceptedSourceOpen = canPreserveHistoryAcceptedTail(sourceFlags, storeAccessDenied);
      let preserveAcceptedCursor = false;
      let mergedPurchases = purchaseRows;
      if (background && hasLoadedDataRef.current && acceptedSourceOpen) {
        const previous = purchasesRef.current;
        preserveAcceptedCursor = historyAcceptedTailBeyondFreshHead(previous, purchaseRows);
        mergedPurchases = mergeHistoryPurchasesBackground(previous, purchaseRows);
      }
      setPurchases(mergedPurchases);
      setSources(sourceFlags);
      setAcceptedAccessDenied(storeAccessDenied);
      if (!acceptedSourceOpen) {
        loadMoreGenerationRef.current += 1;
        setLoadingMoreAccepted(false);
        setLoadMoreError("");
        setAcceptedNextCursor(null);
      } else if (!(background && preserveAcceptedCursor)) {
        setAcceptedNextCursor(acceptedPagination?.hasMore ? acceptedPagination.nextCursor : null);
      }
      setHasIssuedPurchases(mergedPurchases.some((row) => row.direction === "issued"));
      hasLoadedDataRef.current = true;
      setRefreshNotice("");
      setError("");
    } catch (caught) {
      if (generation !== loadGenerationRef.current || scopeAtStart !== loadScopeRef.current) {
        return;
      }
      if (isWalletRefreshUnauthorized(caught)) {
        applyHistoryUnauthorized();
        return;
      }
      if (preserveOnError) {
        setRefreshNotice(WALLET_STALE_DATA_NOTICE);
        return;
      }
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить историю",
      );
      hasLoadedDataRef.current = false;
    } finally {
      if (generation === loadGenerationRef.current && scopeAtStart === loadScopeRef.current) {
        setLoading(false);
      }
    }
  }, [applyHistoryUnauthorized]);

  const loadMoreAccepted = useCallback(async () => {
    if (!acceptedNextCursor || loadingMoreAccepted) {
      return;
    }
    const scopeAtStart = loadScopeRef.current;
    const generationAtStart = loadMoreGenerationRef.current;
    setLoadingMoreAccepted(true);
    setLoadMoreError("");
    try {
      const accepted = await fetchAcceptedPurchasePage(acceptedNextCursor);
      if (
        generationAtStart !== loadMoreGenerationRef.current ||
        scopeAtStart !== loadScopeRef.current
      ) {
        return;
      }
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
      if (
        generationAtStart !== loadMoreGenerationRef.current ||
        scopeAtStart !== loadScopeRef.current
      ) {
        return;
      }
      if (caught instanceof RemcardApiError && caught.status === 401) {
        applyHistoryUnauthorized();
        return;
      }
      if (caught instanceof RemcardApiError && caught.status === 403) {
        loadGenerationRef.current += 1;
        loadMoreGenerationRef.current += 1;
        setPurchases((prev) => prev.filter((row) => row.direction !== "accepted"));
        setAcceptedNextCursor(null);
        setAcceptedAccessDenied(true);
        setSources((prev) => ({ ...prev, acceptedOrders: false }));
        setLoadMoreError("");
        return;
      }
      setLoadMoreError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить следующую страницу",
      );
    } finally {
      if (loadScopeRef.current === scopeAtStart) {
        setLoadingMoreAccepted(false);
      }
    }
  }, [acceptedNextCursor, applyHistoryUnauthorized, loadingMoreAccepted]);

  useEffect(() => {
    void loadHistory();
  }, [historyScopeKey, loadHistory]);

  const onVisibleRefresh = useCallback(
    (_reason: WalletRefreshReason) => loadHistory({ background: true }),
    [loadHistory],
  );

  useWalletVisibleRefresh({
    enabled: backgroundRefreshEnabled,
    scopeKey: historyScopeKey,
    onRefresh: onVisibleRefresh,
  });

  const filteredPurchases = useMemo(() => filterPurchases(purchases, filters), [purchases, filters]);
  const filteredAccruals = useMemo(() => filterAccruals(accruals, filters), [accruals, filters]);
  const purchaseStatuses = useMemo(() => purchaseStatusOptions(purchases), [purchases]);
  const accrualStatuses = useMemo(() => accrualStatusOptions(accruals), [accruals]);

  const directionFilterVisible =
    sources.acceptedOrders && sources.issuedOrders && hasIssuedPurchases;
  const acceptedRowCount = purchases.filter((row) => row.direction === "accepted").length;
  const showAcceptedLimitation = shouldShowAcceptedBonusLimitation(sources);
  const showAcceptedAccessDeniedNote = shouldShowAcceptedAccessDeniedNote(
    acceptedAccessDenied,
    loading,
    Boolean(error),
  );
  const showAcceptedEmptyNote = shouldShowAcceptedBonusEmptyNote(
    sources,
    acceptedRowCount,
    loading,
    Boolean(error),
    acceptedAccessDenied,
  );

  const activeFilterCount = [filters.status, filters.dateFrom, filters.dateTo]
    .filter(Boolean)
    .concat(directionFilterVisible && tab === "purchases" && filters.direction !== "all" ? ["dir"] : [])
    .length;

  const viewPurpose =
    tab === "purchases"
      ? "Покупки · суммы к оплате после скидки"
      : "Начисления · сохранённые суммы по типу операции";

  const totalInTab = tab === "purchases" ? purchases.length : accruals.length;
  const shownInTab = tab === "purchases" ? filteredPurchases.length : filteredAccruals.length;

  return (
    <div className={focus.hub}>
      {refreshNotice ? (
        <p className={focus.notice} role="status" data-testid="history-refresh-notice">
          {refreshNotice}
        </p>
      ) : null}
      <div className={focus.tabs} role="tablist" aria-label="Тип операции">
        <button
          type="button"
          role="tab"
          className={focus.tab}
          aria-selected={tab === "purchases"}
          onClick={() => setTab("purchases")}
        >
          Покупки
          {purchases.length ? <span className={focus.tabCount}>{filteredPurchases.length}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          className={focus.tab}
          aria-selected={tab === "accruals"}
          onClick={() => setTab("accruals")}
        >
          Начисления
          {accruals.length ? <span className={focus.tabCount}>{filteredAccruals.length}</span> : null}
        </button>
      </div>

      <p className={focus.viewPurpose}>{viewPurpose}</p>

      {showAcceptedLimitation ? <p className={focus.notice}>{ACCEPTED_BONUS_SOURCE_NOTE}</p> : null}

      {tab === "purchases" ? <p className={focus.notice}>{PURCHASE_PERIOD_FILTER_NOTE}</p> : null}

      <div className={focus.toolbar}>
        <label className={focus.searchField}>
          <span className={focus.srOnly}>Поиск по партнёру или сертификату</span>
          <input
            className={focus.searchInput}
            type="search"
            placeholder="Партнёр или сертификат"
            autoComplete="off"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </label>
        <button
          type="button"
          className={focus.filterButton}
          aria-expanded={filtersOpen}
          aria-controls="history-filters-panel"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Фильтры
          {activeFilterCount > 0 ? <span aria-hidden="true"> ({activeFilterCount})</span> : null}
          <span aria-hidden="true"> ⌄</span>
        </button>
      </div>

      {filtersOpen ? (
        <div id="history-filters-panel" className={focus.filters}>
          <label className={focus.filterLabel}>
            <span>{tab === "purchases" ? "Статус заказа" : "Статус начисления"}</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">Все статусы</option>
              {(tab === "purchases" ? purchaseStatuses : accrualStatuses).map((status) => (
                <option key={status} value={status}>
                  {tab === "purchases" ? orderStatusLabel(status) : bonusStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className={focus.filterLabel}>
            <span>С даты</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />
          </label>
          <label className={focus.filterLabel}>
            <span>По дату</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </label>
          {directionFilterVisible && tab === "purchases" ? (
            <label className={focus.filterLabel}>
              <span>Направление</span>
              <select
                value={filters.direction}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    direction: event.target.value as HistoryFilters["direction"],
                  }))
                }
              >
                <option value="all">Все</option>
                <option value="accepted">Принято у меня</option>
                <option value="issued">По моим рекомендациям</option>
              </select>
            </label>
          ) : null}
          <div className={focus.filterActions}>
            <button
              type="button"
              className={focus.textButton}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  status: "",
                  dateFrom: "",
                  dateTo: "",
                  direction: "all",
                }))
              }
            >
              Сбросить фильтры
            </button>
            <Button variant="secondary" onClick={() => void loadHistory()} disabled={loading}>
              Обновить
            </Button>
          </div>
        </div>
      ) : null}

      <div className={focus.resultsHeading}>
        <p role="status">
          {tab === "purchases" ? "Покупки" : "Начисления"}: {shownInTab} из {totalInTab}
        </p>
        {filters.search.trim() ? (
          <button
            type="button"
            className={focus.textButton}
            onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
          >
            Сбросить поиск
          </button>
        ) : null}
      </div>

      {loading ? <div className={focus.loading}>Загрузка…</div> : null}

      {!loading && error ? (
        <div className={focus.error} role="alert">
          <p>{error}</p>
          <Button onClick={() => void loadHistory()}>Повторить</Button>
        </div>
      ) : null}

      {!loading && !error && tab === "purchases" && showAcceptedAccessDeniedNote ? (
        <p className={focus.notice}>{ACCEPTED_STORE_ACCESS_DENIED_NOTE}</p>
      ) : null}

      {!loading && !error && tab === "purchases" && showAcceptedEmptyNote ? (
        <p className={focus.notice}>{ACCEPTED_BONUS_EMPTY_NOTE}</p>
      ) : null}

      {!loading && !error && tab === "purchases" ? (
        <>
          {filteredPurchases.length ? (
            <div className={focus.rows}>
              {filteredPurchases.map((row) => (
                <PurchaseRowCard key={`${row.direction}-${row.id}`} row={row} />
              ))}
            </div>
          ) : purchases.length > 0 ? (
            <div className={focus.empty}>
              <strong>Ничего не найдено</strong>
              <p>{FILTERED_PURCHASES_EMPTY_NOTE}</p>
            </div>
          ) : (
            <div className={focus.empty}>
              <strong>Покупок не найдено</strong>
              <p>Когда появятся операции, они отобразятся здесь.</p>
            </div>
          )}
          {acceptedNextCursor ? (
            <div className={focus.loadMore}>
              {loadMoreError ? (
                <div className={focus.error} role="alert" style={{ marginBottom: "var(--space-3)" }}>
                  <p>{loadMoreError}</p>
                  <Button variant="secondary" onClick={() => void loadMoreAccepted()}>
                    Повторить загрузку
                  </Button>
                </div>
              ) : null}
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
      ) : null}

      {!loading && !error && tab === "accruals" ? (
        filteredAccruals.length ? (
          <div className={focus.rows}>
            {filteredAccruals.map((row) => (
              <AccrualRowCard key={`${row.accrualType}-${row.id}`} row={row} />
            ))}
          </div>
        ) : (
          <div className={focus.empty}>
            <strong>Начислений не найдено</strong>
            <p>Когда появятся операции, они отобразятся здесь.</p>
          </div>
        )
      ) : null}

      <details className={focus.finePrint}>
        <summary>Об истории</summary>
        <p>
          Поиск и фильтры работают по загруженным записям. Покупки «Принято у меня» загружаются
          постранично; «По рекомендациям» охватывают до 200 последних заказов. Суммы показаны как
          сохранено, без пересчёта по текущим условиям.
        </p>
      </details>
    </div>
  );
}
