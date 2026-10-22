"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import { bonusStatusLabel, bonusStatusTone } from "@/lib/history-labels";
import { fetchSettlements, isSettlementsAccessDenied } from "@/lib/settlements-loader";
import { settlementAccrualHref, settlementPurchaseHref } from "@/lib/settlements-links";
import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
  SettlementsResponse,
} from "@/lib/settlements-types";
import {
  buildExportRows,
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
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import hubStyles from "@/components/settlements/settlements.module.css";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type Screen = "overview" | "partners" | "orders" | "partnerHistory" | "reconciliation";

const PAGE_SIZE = 10;

type Props = {
  previewData?: SettlementsResponse;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ObligationCard({
  row,
  view,
}: {
  row: SettlementObligation;
  view: SettlementViewMode;
}) {
  const compact = view === "compact";
  const full = view === "cards";
  const rowClass =
    view === "rows"
      ? `${hubStyles.row} ${walletStyles.rowFlat}`
      : view === "compact"
        ? `${hubStyles.row} ${walletStyles.rowCompact}`
        : hubStyles.row;

  return (
    <article className={rowClass} data-testid={`specialist-settlement-row-${row.id}`}>
      <div className={hubStyles.rowHeader}>
        <div>
          <p className={hubStyles.rowTitle}>{formatMoneyRub(row.amount)}</p>
          {!compact ? <p className={hubStyles.meta}>{row.basis}</p> : null}
          {full ? (
            <p className={hubStyles.meta}>
              Заказ: {row.orderId} · ID начисления: {row.id}
            </p>
          ) : null}
          {full ? (
            <p className={hubStyles.meta}>Партнёр: {row.counterpartyName}</p>
          ) : null}
        </div>
        <StatusBadge label={bonusStatusLabel(row.status)} tone={bonusStatusTone(row.status)} />
      </div>
      {view !== "compact" ? (
        <p className={hubStyles.meta}>Создано: {formatDate(row.createdAt)}</p>
      ) : null}
      {full ? (
        <div className={hubStyles.actions}>
          <Link href={settlementAccrualHref(row)} className={hubStyles.linkButton}>
            Начисление
          </Link>
          <Link href={settlementPurchaseHref(row)} className={hubStyles.linkButton}>
            Покупка
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function CompletedRow({ row }: { row: SettlementCompleted }) {
  return (
    <Link
      key={`${row.id}-${row.paidAt ?? "unknown"}`}
      href={settlementAccrualHref(row)}
      className={hubStyles.row}
    >
      <div className={hubStyles.rowHeader}>
        <div>
          <p className={hubStyles.rowTitle}>{formatMoneyRub(row.amount)}</p>
          <p className={hubStyles.meta}>{row.counterpartyName}</p>
          <p className={hubStyles.meta}>{specialistCompletedRowCaption(row)}</p>
          <p className={hubStyles.meta}>
            {row.paidAt
              ? `Зафиксировано: ${formatDate(row.paidAt)}`
              : "Дата выплаты не зафиксирована (legacy PAID)"}
          </p>
        </div>
        <StatusBadge label="Зафиксированная выплата" tone={bonusStatusTone(row.status)} />
      </div>
    </Link>
  );
}

export function SpecialistSettlementsWorkspace({ previewData }: Props) {
  const [screen, setScreen] = useState<Screen>("overview");
  const [direction, setDirection] = useState<SettlementDirection>("receivable");
  const [selectedPartner, setSelectedPartner] = useState<SettlementPartnerGroup | null>(null);
  const [filters, setFilters] = useState<SettlementLedgerFilters>(defaultLedgerFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<SettlementViewMode>("rows");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!previewData);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [exportError, setExportError] = useState("");
  const [data, setData] = useState<SettlementsResponse | null>(previewData ?? null);

  const periodError = useMemo(
    () => validateLedgerPeriod(filters.from, filters.to),
    [filters.from, filters.to],
  );

  const load = useCallback(async () => {
    if (previewData) return;
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      setData(await fetchSettlements());
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
  }, [previewData]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div data-testid="specialist-settlements-workspace">
      {data.coverageNote ? <p className={hubStyles.note}>{data.coverageNote}</p> : null}
      <p className={hubStyles.note}>
        Подтверждение выплат получателем и частичные переводы в этом этапе не подключены — отображаются
        только факты из текущей модели начислений.
      </p>

      <div className={walletStyles.toolbar}>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {filtersOpen ? "Скрыть фильтры" : "Фильтры и представление"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportCurrent()} disabled={Boolean(periodError)}>
          Excel (.xlsx, весь отбор)
        </Button>
      </div>

      {exportError ? (
        <p className={hubStyles.error} role="alert">
          {exportError}
        </p>
      ) : null}

      {filtersOpen ? (
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
            <option value="compact">Компактные карточки</option>
            <option value="cards">Полные карточки</option>
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
              className={`${hubStyles.summaryCard} ${walletStyles.directionTile} ${
                screen !== "overview" && direction === "receivable"
                  ? walletStyles.directionTileActive
                  : ""
              }`}
              onClick={() => openDirection("receivable")}
              data-testid="specialist-wallet-receivable-total"
            >
              <p className={hubStyles.summaryLabel}>Мне должны</p>
              <p className={hubStyles.summaryValue}>{formatMoneyRub(receivableTotal)}</p>
              <p className={walletStyles.directionTileHint}>К партнёрам →</p>
            </button>
            <button
              type="button"
              className={`${hubStyles.summaryCard} ${walletStyles.directionTile} ${
                screen !== "overview" && direction === "payable"
                  ? walletStyles.directionTileActive
                  : ""
              }`}
              onClick={() => openDirection("payable")}
              data-testid="specialist-wallet-payable-total"
            >
              <p className={hubStyles.summaryLabel}>Я должен</p>
              <p className={hubStyles.summaryValue}>{formatMoneyRub(payableTotal)}</p>
              <p className={walletStyles.directionTileHint}>К партнёрам →</p>
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
          <Button type="button" variant="secondary" onClick={() => setScreen("overview")}>
            ← Обзор
          </Button>
          <h2 className={hubStyles.groupTitle}>
            {direction === "receivable" ? "Мне должны" : "Я должен"}
          </h2>
          {pagedPartners.length === 0 ? (
            <div className={hubStyles.empty}>Нет записей по текущему отбору.</div>
          ) : (
            pagedPartners.map((group) => (
              <button
                key={group.counterpartyId}
                type="button"
                className={`${hubStyles.group} ${walletStyles.partnerButton}`}
                onClick={() => {
                  setSelectedPartner(group);
                  setPage(1);
                  setScreen("orders");
                }}
              >
                <div className={hubStyles.groupHeader}>
                  <p className={hubStyles.groupTitle}>{group.counterpartyName}</p>
                  <p className={hubStyles.groupTotal}>
                    {group.completedOnly
                      ? "Только история"
                      : formatMoneyRub(group.totalAmount)}
                  </p>
                </div>
              </button>
            ))
          )}
        </>
      ) : null}

      {screen === "orders" && selectedPartner ? (
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setScreen("partners");
              setSelectedPartner(null);
              setPage(1);
            }}
          >
            ← Партнёры
          </Button>
          <h2 className={hubStyles.groupTitle}>{selectedPartner.counterpartyName}</h2>
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
                <ObligationCard key={row.id} row={row} view={view} />
              ))}
            </div>
          )}
          {direction === "payable" ? (
            <p className={hubStyles.note}>
              Кнопка «Зафиксировать выплату» скрыта: протокол подтверждения получателем будет подключён
              отдельным этапом backend.
            </p>
          ) : null}
        </>
      ) : null}

      {screen === "partnerHistory" && selectedPartner && partnerHistory ? (
        <>
          <Button type="button" variant="secondary" onClick={() => setScreen("orders")}>
            ← {selectedPartner.counterpartyName}
          </Button>
          <h2 className={hubStyles.groupTitle}>История партнёра (завершённые)</h2>
          <p className={hubStyles.note}>
            Показаны только зафиксированные выплаты с известной датой paidAt в выбранном периоде.
            Частичные выплаты и юридические snapshots не восстанавливаются.
          </p>
          {partnerHistory.excludedUnknownPaidAt > 0 ? (
            <p className={hubStyles.meta}>
              Исключено legacy PAID без paidAt: {partnerHistory.excludedUnknownPaidAt}
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
        <div className={hubStyles.actions}>
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
    </div>
  );
}
