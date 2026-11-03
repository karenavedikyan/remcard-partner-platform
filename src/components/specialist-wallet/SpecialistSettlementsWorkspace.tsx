"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import { fetchSettlements, isSettlementsAccessDenied } from "@/lib/settlements-loader";
import { settlementAccrualHref, settlementPurchaseHref } from "@/lib/settlements-links";
import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
  SettlementsResponse,
} from "@/lib/settlements-types";
import {
  clampPage,
  defaultLedgerFilters,
  directionTotal,
  filterOpenObligations,
  pageCount,
  paginateRows,
  partnerCompletedHistory,
  partnerGroupsForDirection,
  reconciliationSummary,
  resolveExportScope,
  specialistCompletedRowCaption,
  validateLedgerPeriod,
  type SettlementDirection,
  type SettlementLedgerFilters,
  type SettlementViewMode,
} from "@/lib/specialist-settlements/ledger";
import { downloadMasterSettlementsXlsx } from "@/lib/specialist-settlements/export-xlsx";
import {
  PayoutRecordModal,
  type PayoutRecordTarget,
} from "@/components/payout/PayoutRecordModal";
import { Button } from "@/components/ui/Button";
import { RewardLifecyclePanel } from "@/components/settlements/RewardLifecyclePanel";
import hubStyles from "@/components/settlements/settlements.module.css";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";
import { WalletSectionEmptyState } from "@/components/wallet-empty/WalletSectionEmptyState";
import { isWalletSettlementsDataEmpty } from "@/lib/wallet-empty/is-empty";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import { isSupportedWalletEmptyViewerRole } from "@/lib/wallet-empty/viewer-role";
import {
  bonusStatusLabel,
  bonusStatusTone,
  type HistoryStatusTone,
} from "@/lib/history-labels";

type Screen = "overview" | "partners" | "orders" | "partnerHistory" | "reconciliation";

const PAGE_SIZE = 10;

type Props = {
  previewData?: SettlementsResponse;
  payableSummaryLabel?: string;
  payableDirectionLabel?: string;
  payableHint?: string | null;
  /** When scope changes, clears stale UI (payout dialog, drill-down). */
  scopeKey?: string;
  /** Role for new-partner empty onboarding (settlements tab only). */
  walletEmptyViewerRole?: WalletEmptyViewerProps["walletEmptyViewerRole"];
};

const DEFAULT_PAYABLE_SUMMARY = "Я должен";

function obligationPrimaryTitle(row: SettlementObligation) {
  const basis = row.basis?.trim();
  return basis || "Начисление";
}

function partnerFocusAmount(group: SettlementPartnerGroup) {
  if (group.completedOnly) return "—";
  if (group.totalAmount <= 0) return "—";
  return formatMoneyRub(group.totalAmount);
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

function statusPillClass(tone: HistoryStatusTone) {
  if (tone === "active") return hubStyles.statusGreen;
  if (tone === "pending") return hubStyles.statusAmber;
  return hubStyles.statusPrimary;
}

function StatusPill({ label, tone }: { label: string; tone: HistoryStatusTone }) {
  return (
    <span className={`${hubStyles.statusPill} ${statusPillClass(tone)}`}>{label}</span>
  );
}

function ObligationBreakdown({ row }: { row: SettlementObligation }) {
  const hasPaid = (row.paidAmount ?? 0) > 0;
  const hasPending = (row.pendingAmount ?? 0) > 0;
  const hasSuspended = (row.suspendedAmount ?? 0) > 0;
  return (
    <dl className={hubStyles.breakdown}>
      <div className={hubStyles.breakdownRow}>
        <dt>Начислено</dt>
        <dd>{formatMoneyRub(row.amount)}</dd>
      </div>
      {hasPending ? (
        <div className={hubStyles.breakdownRow}>
          <dt>Ожидает подтверждения</dt>
          <dd>{formatMoneyRub(row.pendingAmount!)}</dd>
        </div>
      ) : null}
      {hasSuspended ? (
        <div className={hubStyles.breakdownRow}>
          <dt>Приостановлено</dt>
          <dd>{formatMoneyRub(row.suspendedAmount!)}</dd>
        </div>
      ) : null}
      {hasPaid ? (
        <div className={hubStyles.breakdownRow}>
          <dt>Оплата подтверждена</dt>
          <dd>{formatMoneyRub(row.paidAmount!)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function ObligationCard({
  row,
  view,
  onRecordPayout,
}: {
  row: SettlementObligation;
  view: SettlementViewMode;
  onRecordPayout?: (row: SettlementObligation) => void;
}) {
  const canPayout =
    row.payoutActions &&
    (row.payoutActions.canRecordCash || row.payoutActions.canRecordTransfer);
  const compact = view === "compact";
  const full = view === "cards";
  const statusLabel = row.confirmationLabel ?? bonusStatusLabel(row.status);
  const tone = bonusStatusTone(row.status);

  return (
    <article
      className={`${hubStyles.compactRecord} ${view === "rows" ? walletStyles.rowFlat : ""} ${
        compact ? walletStyles.rowCompact : ""
      }`}
      data-testid={`specialist-settlement-row-${row.id}`}
    >
      <details open={full}>
        <summary>
          <span className={hubStyles.recordLineInfo}>
            <strong>{compact ? formatMoneyRub(row.amount) : obligationPrimaryTitle(row)}</strong>
            {!compact ? <span>{row.counterpartyName}</span> : null}
            {compact ? <small>{row.basis}</small> : null}
          </span>
          <span className={hubStyles.recordLineValue}>
            {!compact ? <strong>{formatMoneyRub(row.amount)}</strong> : null}
            <StatusPill label={statusLabel} tone={tone} />
          </span>
        </summary>
        <div className={hubStyles.recordDetail}>
          <ObligationBreakdown row={row} />
          {(row.pendingAmount ?? 0) > 0 ? (
            <p className={hubStyles.meta}>
              Ожидает подтверждения: {formatMoneyRub(row.pendingAmount!)}. Не входит в баланс.
            </p>
          ) : null}
          {view !== "compact" ? (
            <p className={hubStyles.meta}>Создано: {formatDate(row.createdAt)}</p>
          ) : null}
          <p className={hubStyles.meta}>
            Заказ: {row.orderId} · ID начисления: {row.id}
          </p>
          {row.hasIndividualTerms ? (
            <details className={hubStyles.lifecycleDetails}>
              <summary>Категории, сроки и расчёты</summary>
              <RewardLifecyclePanel orderId={row.orderId} />
            </details>
          ) : null}
          {view === "rows" || full || compact ? (
            <div className={hubStyles.actions}>
              <Link href={settlementAccrualHref(row)} className={hubStyles.linkButton}>
                Начисление
              </Link>
              <Link href={settlementPurchaseHref(row)} className={hubStyles.linkButton}>
                Покупка
              </Link>
              {canPayout && onRecordPayout ? (
                <Button
                  type="button"
                  variant="secondary"
                  data-testid={`specialist-settlements-record-payout-${row.id}`}
                  onClick={() => onRecordPayout(row)}
                >
                  Зафиксировать выплату
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function CompletedRow({ row }: { row: SettlementCompleted }) {
  return (
    <article className={hubStyles.historyCard}>
      <details>
        <summary>
          <span className={hubStyles.recordLineInfo}>
            <strong>{row.counterpartyName}</strong>
            <small>{specialistCompletedRowCaption(row)}</small>
            <small>
              {row.paidAt
                ? `Оплачено: ${formatDate(row.paidAt)}`
                : "Дата выплаты не зафиксирована"}
            </small>
          </span>
          <strong>{formatMoneyRub(row.amount)}</strong>
        </summary>
        <div className={hubStyles.recordDetail}>
          <StatusPill label="Зафиксированная выплата" tone={bonusStatusTone(row.status)} />
          <div className={hubStyles.actions}>
            <Link href={settlementAccrualHref(row)} className={hubStyles.linkButton}>
              Начисление
            </Link>
            <Link href={settlementPurchaseHref(row)} className={hubStyles.linkButton}>
              Покупка
            </Link>
          </div>
        </div>
      </details>
    </article>
  );
}

export function SpecialistSettlementsWorkspace({
  previewData,
  payableSummaryLabel = DEFAULT_PAYABLE_SUMMARY,
  payableDirectionLabel = DEFAULT_PAYABLE_SUMMARY,
  payableHint = null,
  scopeKey = "default",
  walletEmptyViewerRole = "specialist",
}: Props) {
  const [screen, setScreen] = useState<Screen>("overview");
  const [direction, setDirection] = useState<SettlementDirection>("receivable");
  const [selectedPartner, setSelectedPartner] = useState<SettlementPartnerGroup | null>(null);
  const [filters, setFilters] = useState<SettlementLedgerFilters>(defaultLedgerFilters());
  const [view, setView] = useState<SettlementViewMode>("rows");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!previewData);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [exportError, setExportError] = useState("");
  const [data, setData] = useState<SettlementsResponse | null>(previewData ?? null);
  const [payoutTarget, setPayoutTarget] = useState<PayoutRecordTarget | null>(null);
  const loadGenerationRef = useRef(0);

  const openPayoutModal = useCallback((row: SettlementObligation) => {
    if (!row.payoutActions) return;
    setPayoutTarget({
      bonusId: row.id,
      counterpartyName: row.counterpartyName,
      amount: row.amount,
      basis: row.basis,
      payoutActions: row.payoutActions,
    });
  }, []);

  const periodError = useMemo(
    () => validateLedgerPeriod(filters.from, filters.to),
    [filters.from, filters.to],
  );

  const load = useCallback(async () => {
    if (previewData) return;
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      const result = await fetchSettlements();
      if (generation !== loadGenerationRef.current) return;
      setData(result);
    } catch (caught) {
      if (generation !== loadGenerationRef.current) return;
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
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [previewData]);

  useEffect(() => {
    loadGenerationRef.current += 1;
    setPayoutTarget(null);
    setScreen("overview");
    setDirection("receivable");
    setSelectedPartner(null);
    setPage(1);
    setExportError("");
    if (!previewData) {
      void load();
    }
  }, [scopeKey, load, previewData]);

  const updateFilters = useCallback((patch: Partial<SettlementLedgerFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const receivableTotal = useMemo(
    () => directionTotal(data?.receivable ?? [], data?.payable ?? [], "receivable"),
    [data],
  );
  const payableTotal = useMemo(
    () => directionTotal(data?.receivable ?? [], data?.payable ?? [], "payable"),
    [data],
  );

  const partnerGroups = useMemo(() => {
    if (!data || periodError) return [];
    return partnerGroupsForDirection(
      data.receivable,
      data.payable,
      data.completed,
      direction,
      filters,
    );
  }, [data, direction, filters, periodError]);

  const allOrderRows = useMemo(() => {
    if (!selectedPartner || !data || periodError) return [] as SettlementObligation[];
    const source = direction === "receivable" ? data.receivable : data.payable;
    return filterOpenObligations(source, filters).filter(
      (row) => row.counterpartyId === selectedPartner.counterpartyId,
    );
  }, [data, direction, filters, periodError, selectedPartner]);

  const partnerHistory = useMemo(() => {
    if (!selectedPartner || !data) return null;
    return partnerCompletedHistory(
      data.completed,
      direction,
      selectedPartner.counterpartyId,
      filters,
    );
  }, [data, direction, filters, selectedPartner]);

  const recon = useMemo(() => {
    if (!data || periodError) return null;
    return reconciliationSummary(data.completed, filters);
  }, [data, filters, periodError]);

  const listForPagination = useMemo(() => {
    if (screen === "partners") return partnerGroups;
    if (screen === "orders") return allOrderRows;
    if (screen === "partnerHistory") return partnerHistory?.inPeriod ?? [];
    if (screen === "reconciliation") return recon?.rows ?? [];
    return [];
  }, [allOrderRows, partnerGroups, partnerHistory, recon, screen]);

  const safePage = useMemo(
    () => clampPage(page, listForPagination, PAGE_SIZE),
    [listForPagination, page],
  );

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [page, safePage]);

  const pagedPartners = useMemo(
    () => paginateRows(partnerGroups, safePage, PAGE_SIZE),
    [partnerGroups, safePage],
  );
  const orderRows = useMemo(
    () => paginateRows(allOrderRows, safePage, PAGE_SIZE),
    [allOrderRows, safePage],
  );
  const pagedReconRows = useMemo(
    () => paginateRows(recon?.rows ?? [], safePage, PAGE_SIZE),
    [recon, safePage],
  );
  const pagedHistoryRows = useMemo(
    () => paginateRows(partnerHistory?.inPeriod ?? [], safePage, PAGE_SIZE),
    [partnerHistory, safePage],
  );

  const totalPages = pageCount(listForPagination, PAGE_SIZE);

  function openDirection(next: SettlementDirection) {
    setDirection(next);
    setSelectedPartner(null);
    setPage(1);
    setScreen("partners");
  }

  async function exportCurrent() {
    if (!data || periodError) return;
    setExportError("");
    try {
      const scope = resolveExportScope(screen);
      await downloadMasterSettlementsXlsx({
        scope,
        direction,
        filters,
        counterpartyId:
          scope === "partnerHistory"
            ? selectedPartner?.counterpartyId
            : scope === "open" && (screen === "orders" || screen === "partners")
              ? selectedPartner?.counterpartyId ?? null
              : null,
      });
    } catch (caught) {
      setExportError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось выгрузить Excel",
      );
    }
  }

  if (loading) {
    return <div className={hubStyles.loading}>Загружаем кошелёк…</div>;
  }
  if (accessDenied) {
    return (
      <div className={hubStyles.error} role="alert">
        <p>Раздел недоступен для этого аккаунта.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={hubStyles.error} role="alert">
        <p>{error}</p>
        <Button type="button" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={hubStyles.error} role="alert">
        <p>Не удалось загрузить данные кошелька.</p>
      </div>
    );
  }

  const filtersAreDefault =
    filters.q === "" &&
    filters.status === "open" &&
    filters.sort === "date-desc" &&
    filters.from === "" &&
    filters.to === "";
  const showWalletEmpty =
    screen === "overview" &&
    filtersAreDefault &&
    !periodError &&
    isWalletSettlementsDataEmpty(data) &&
    isSupportedWalletEmptyViewerRole(walletEmptyViewerRole);

  if (showWalletEmpty) {
    return (
      <div className={hubStyles.settlementDemo} data-testid="specialist-settlements-workspace">
        <WalletSectionEmptyState role={walletEmptyViewerRole} />
      </div>
    );
  }

  return (
    <div className={hubStyles.settlementDemo} data-testid="specialist-settlements-workspace">
      {data.coverageNote ? <p className={hubStyles.note}>{data.coverageNote}</p> : null}
      <p className={hubStyles.note}>
        Подтверждение получения вторым участником и частичные переводы пока недоступны. Показаны
        данные по подтверждённым покупкам.
      </p>

      <div className={hubStyles.ledgerPresentation}>
        <details className={hubStyles.searchDrawer}>
          <summary>Поиск и фильтры</summary>
          <div className={walletStyles.filtersPanel}>
            <input
              aria-label="Поиск"
              value={filters.q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              placeholder="Партнёр, заказ, сертификат…"
              className={walletStyles.search}
            />
            <select
              aria-label="Статус"
              value={filters.status}
              onChange={(e) =>
                updateFilters({ status: e.target.value as SettlementLedgerFilters["status"] })
              }
            >
              <option value="open">Открытые</option>
              <option value="all">Все статусы</option>
            </select>
            <select
              aria-label="Сортировка"
              value={filters.sort}
              onChange={(e) =>
                updateFilters({ sort: e.target.value as SettlementLedgerFilters["sort"] })
              }
            >
              <option value="date-desc">Сначала новые</option>
              <option value="date-asc">Сначала старые</option>
              <option value="amount-desc">Сумма ↓</option>
              <option value="amount-asc">Сумма ↑</option>
            </select>
            <input
              aria-label="Период с"
              type="date"
              value={filters.from}
              onChange={(e) => updateFilters({ from: e.target.value })}
            />
            <input
              aria-label="Период по"
              type="date"
              value={filters.to}
              onChange={(e) => updateFilters({ to: e.target.value })}
            />
            <select
              aria-label="Представление"
              value={view}
              onChange={(e) => setView(e.target.value as SettlementViewMode)}
            >
              <option value="rows">Строки</option>
              <option value="compact">Малые</option>
              <option value="cards">Крупные</option>
            </select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFilters(defaultLedgerFilters());
                setPage(1);
              }}
            >
              Сбросить фильтры
            </Button>
          </div>
        </details>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void exportCurrent()}
          disabled={Boolean(periodError)}
        >
          Excel (.xlsx, весь отбор)
        </Button>
      </div>

      {exportError ? (
        <p className={hubStyles.error} role="alert">
          {exportError}
        </p>
      ) : null}

      {periodError ? (
        <div className={hubStyles.error} role="alert">
          <p>{periodError}</p>
        </div>
      ) : null}

      {screen === "overview" ? (
        <>
          <div className={`${hubStyles.summary} ${walletStyles.directionSummary}`}>
            <button
              type="button"
              className={`${hubStyles.summaryCard} ${hubStyles.summaryCardButton} ${hubStyles.summaryCardReceivable} ${walletStyles.directionTile}`}
              onClick={() => openDirection("receivable")}
              data-testid="specialist-wallet-receivable-total"
            >
              <p className={hubStyles.summaryLabel}>Мне должны</p>
              <p className={hubStyles.summaryValue}>{formatMoneyRub(receivableTotal)}</p>
              <p className={hubStyles.summaryTileFooter}>
                <span />
                <span>Посмотреть партнёров →</span>
              </p>
            </button>
            <button
              type="button"
              className={`${hubStyles.summaryCard} ${hubStyles.summaryCardButton} ${walletStyles.directionTile}`}
              onClick={() => openDirection("payable")}
              data-testid="specialist-wallet-payable-total"
            >
              <p className={hubStyles.summaryLabel}>{payableSummaryLabel}</p>
              <p className={hubStyles.summaryValue}>{formatMoneyRub(payableTotal)}</p>
              {payableHint ? <p className={hubStyles.meta}>{payableHint}</p> : null}
              <p className={hubStyles.summaryTileFooter}>
                <span />
                <span>Посмотреть партнёров →</span>
              </p>
            </button>
          </div>
          <div className={hubStyles.actions}>
            <Button type="button" onClick={() => setScreen("reconciliation")}>
              Сверка за период
            </Button>
          </div>
        </>
      ) : null}

      {screen === "partners" ? (
        <>
          <button
            type="button"
            className={hubStyles.breadcrumbBack}
            onClick={() => setScreen("overview")}
          >
            ← Все взаиморасчёты
          </button>
          <div className={hubStyles.focusHeader}>
            <div>
              <p className={hubStyles.meta}>
                {direction === "receivable" ? "Мне должны" : payableDirectionLabel}
              </p>
              <h2 className={hubStyles.groupTitle}>Партнёры</h2>
            </div>
          </div>
          {pagedPartners.length === 0 ? (
            <div className={hubStyles.empty}>Нет записей по текущему отбору.</div>
          ) : (
            <div className={hubStyles.list}>
              {pagedPartners.map((group) => {
                const countLabel = `${group.items.length} ${
                  group.items.length === 1
                    ? "начисление"
                    : group.items.length < 5
                      ? "начисления"
                      : "начислений"
                }`;
                return (
                  <button
                    key={group.counterpartyId}
                    type="button"
                    data-testid={`specialist-partner-group-${group.counterpartyId}`}
                    className={`${hubStyles.partnerCompact} ${walletStyles.partnerButton}`}
                    onClick={() => {
                      setSelectedPartner(group);
                      setPage(1);
                      setScreen("orders");
                    }}
                  >
                    <span className={hubStyles.partnerCompactMain}>
                      <strong className={hubStyles.groupTitle}>{group.counterpartyName}</strong>
                      <p className={hubStyles.partnerCompactMeta}>
                        {group.completedOnly ? "Только история" : countLabel}
                      </p>
                    </span>
                    <span className={hubStyles.partnerCompactAmount}>
                      <strong>
                        {group.completedOnly
                          ? "—"
                          : formatMoneyRub(group.totalAmount)}
                      </strong>
                      <span aria-hidden="true">→</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {screen === "orders" && selectedPartner ? (
        <>
          <button
            type="button"
            className={hubStyles.breadcrumbBack}
            onClick={() => {
              setScreen("partners");
              setSelectedPartner(null);
              setPage(1);
            }}
          >
            ← К партнёрам
          </button>
          <div className={hubStyles.focusHeader}>
            <div>
              <p className={hubStyles.meta}>
                {direction === "receivable" ? "Мне должны" : payableDirectionLabel}
              </p>
              <h2 className={hubStyles.groupTitle}>{selectedPartner.counterpartyName}</h2>
            </div>
            <strong className={hubStyles.focusHeaderAmount}>
              {partnerFocusAmount(selectedPartner)}
            </strong>
          </div>
          {selectedPartner.completedOnly ? (
            <p className={hubStyles.meta}>Только история завершённых выплат</p>
          ) : null}
          <div className={hubStyles.actions}>
            <Button type="button" variant="secondary" onClick={() => setScreen("partnerHistory")}>
              История партнёра
            </Button>
          </div>
          {orderRows.length === 0 ? (
            <div className={hubStyles.empty}>Нет открытых записей по текущему отбору.</div>
          ) : (
            <div className={hubStyles.list}>
              {orderRows.map((row) => (
                <ObligationCard
                  key={row.id}
                  row={row}
                  view={view}
                  onRecordPayout={direction === "payable" ? openPayoutModal : undefined}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {screen === "partnerHistory" && selectedPartner && partnerHistory ? (
        <>
          <Button type="button" variant="secondary" onClick={() => setScreen("orders")}>
            ← {selectedPartner.counterpartyName}
          </Button>
          <h2 className={hubStyles.groupTitle}>История партнёра (завершённые)</h2>
          <p className={hubStyles.note}>
            Показаны только зафиксированные выплаты с известной датой выплаты в выбранном периоде.
          </p>
          {partnerHistory.excludedUnknownPaidAt > 0 ? (
            <p className={hubStyles.meta}>
              Не показано выплат без даты: {partnerHistory.excludedUnknownPaidAt}
            </p>
          ) : null}
          {pagedHistoryRows.length === 0 ? (
            <div className={hubStyles.empty}>Нет завершённых записей по текущему отбору.</div>
          ) : (
            pagedHistoryRows.map((row) => <CompletedRow key={`${row.id}-hist`} row={row} />)
          )}
        </>
      ) : null}

      {screen === "reconciliation" && recon ? (
        <>
          <Button type="button" variant="secondary" onClick={() => setScreen("overview")}>
            ← Обзор
          </Button>
          <h2 className={hubStyles.groupTitle}>Сверка (ограниченная)</h2>
          <p className={hubStyles.meta}>
            Завершено «мне должны»: {formatMoneyRub(recon.receivableTotal)} · «я должен»:{" "}
            {formatMoneyRub(recon.payableTotal)}
          </p>
          <ul className={hubStyles.note}>
            {recon.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          {pagedReconRows.length === 0 ? (
            <div className={hubStyles.empty}>Нет завершённых записей в выбранном периоде.</div>
          ) : (
            pagedReconRows.map((row) => <CompletedRow key={`${row.id}-recon`} row={row} />)
          )}
        </>
      ) : null}

      {screen !== "overview" ? (
        <div className={hubStyles.ledgerPagination}>
          <Button
            type="button"
            variant="secondary"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </Button>
          <span className={hubStyles.meta}>
            Страница {safePage} из {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </div>
      ) : null}

      {payoutTarget ? (
        <PayoutRecordModal
          target={payoutTarget}
          onClose={() => setPayoutTarget(null)}
          onSuccess={() => void load()}
        />
      ) : null}
    </div>
  );
}
