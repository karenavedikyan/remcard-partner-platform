"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import { bonusStatusLabel, bonusStatusTone } from "@/lib/history-labels";
import { fetchSettlements, isSettlementsAccessDenied } from "@/lib/settlements-loader";
import {
  completedDirectionLabel,
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
} from "@/lib/settlements-types";
import {
  buildExportRows,
  defaultLedgerFilters,
  directionTotal,
  filterOpenObligations,
  paginateRows,
  partnerGroupsForDirection,
  reconciliationSummary,
  type SettlementDirection,
  type SettlementLedgerFilters,
  type SettlementViewMode,
} from "@/lib/specialist-settlements/ledger";
import { downloadSettlementExportCsv } from "@/lib/specialist-settlements/export-csv";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import hubStyles from "@/components/settlements/settlements.module.css";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type Screen = "overview" | "partners" | "orders" | "reconciliation";

const PAGE_SIZE = 10;

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
  return (
    <article
      className={hubStyles.row}
      data-testid={`specialist-settlement-row-${row.id}`}
    >
      <div className={hubStyles.rowHeader}>
        <div>
          <p className={hubStyles.rowTitle}>{formatMoneyRub(row.amount)}</p>
          {!compact ? <p className={hubStyles.meta}>{row.basis}</p> : null}
          {full ? (
            <p className={hubStyles.meta}>
              Заказ: {row.orderId} · ID начисления: {row.id}
            </p>
          ) : null}
        </div>
        <StatusBadge label={bonusStatusLabel(row.status)} tone={bonusStatusTone(row.status)} />
      </div>
      {!compact ? <p className={hubStyles.meta}>Создано: {formatDate(row.createdAt)}</p> : null}
      <div className={hubStyles.actions}>
        <Link href={settlementAccrualHref(row)} className={hubStyles.linkButton}>
          Начисление
        </Link>
        <Link href={settlementPurchaseHref(row)} className={hubStyles.linkButton}>
          Покупка
        </Link>
      </div>
    </article>
  );
}

export function SpecialistSettlementsWorkspace() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [direction, setDirection] = useState<SettlementDirection>("receivable");
  const [selectedPartner, setSelectedPartner] = useState<SettlementPartnerGroup | null>(null);
  const [filters, setFilters] = useState<SettlementLedgerFilters>(defaultLedgerFilters());
  const [view, setView] = useState<SettlementViewMode>("rows");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [data, setData] = useState<SettlementsResponse | null>(null);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const receivableTotal = useMemo(
    () => directionTotal(data?.receivable ?? [], data?.payable ?? [], "receivable"),
    [data],
  );
  const payableTotal = useMemo(
    () => directionTotal(data?.receivable ?? [], data?.payable ?? [], "payable"),
    [data],
  );

  const partnerGroups = useMemo(() => {
    if (!data) return [];
    return partnerGroupsForDirection(
      data.receivable,
      data.payable,
      direction,
      filters,
    );
  }, [data, direction, filters]);

  const orderRows = useMemo(() => {
    if (!selectedPartner || !data) return [] as SettlementObligation[];
    const source = direction === "receivable" ? data.receivable : data.payable;
    const filtered = filterOpenObligations(source, filters).filter(
      (row) => row.counterpartyId === selectedPartner.counterpartyId,
    );
    return paginateRows(filtered, page, PAGE_SIZE);
  }, [data, direction, filters, page, selectedPartner]);

  const pagedPartners = useMemo(
    () => paginateRows(partnerGroups, page, PAGE_SIZE),
    [partnerGroups, page],
  );

  const recon = useMemo(() => {
    if (!data) return null;
    return reconciliationSummary(data.completed, filters.from, filters.to);
  }, [data, filters.from, filters.to]);

  function openDirection(next: SettlementDirection) {
    setDirection(next);
    setSelectedPartner(null);
    setPage(1);
    setScreen("partners");
  }

  function exportCurrent() {
    if (!data) return;
    const rows = buildExportRows(data.receivable, data.payable, direction, filters);
    downloadSettlementExportCsv(
      rows,
      `RemCard-specialist-settlements-${direction}-${new Date().toISOString().slice(0, 10)}`,
    );
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
        <input
          aria-label="Поиск"
          value={filters.q}
          onChange={(e) => {
            setFilters((f) => ({ ...f, q: e.target.value }));
            setPage(1);
          }}
          placeholder="Партнёр, заказ, сертификат…"
          className={walletStyles.search}
        />
        <select
          aria-label="Сортировка"
          value={filters.sort}
          onChange={(e) =>
            setFilters((f) => ({ ...f, sort: e.target.value as SettlementLedgerFilters["sort"] }))
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
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
        />
        <input
          aria-label="Период по"
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
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
        <Button type="button" variant="secondary" onClick={exportCurrent}>
          Excel (CSV, весь отбор)
        </Button>
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

      {screen === "overview" ? (
        <>
          <div className={hubStyles.summary}>
            <button
              type="button"
              className={hubStyles.summaryCard}
              onClick={() => openDirection("receivable")}
              data-testid="specialist-wallet-receivable-total"
            >
              <p className={hubStyles.summaryLabel}>Мне должны</p>
              <p className={hubStyles.summaryValue}>{formatMoneyRub(receivableTotal)}</p>
            </button>
            <button
              type="button"
              className={hubStyles.summaryCard}
              onClick={() => openDirection("payable")}
              data-testid="specialist-wallet-payable-total"
            >
              <p className={hubStyles.summaryLabel}>Я должен</p>
              <p className={hubStyles.summaryValue}>{formatMoneyRub(payableTotal)}</p>
            </button>
            <div className={hubStyles.summaryCard}>
              <p className={hubStyles.summaryLabel}>Завершённые</p>
              <p className={hubStyles.summaryValue}>{data.completed.length}</p>
            </div>
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
                  <p className={hubStyles.groupTotal}>{formatMoneyRub(group.totalAmount)}</p>
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
            }}
          >
            ← {selectedPartner.counterpartyName}
          </Button>
          <div className={hubStyles.list}>
            {orderRows.map((row) => (
              <ObligationCard key={row.id} row={row} view={view} />
            ))}
          </div>
          {direction === "payable" ? (
            <p className={hubStyles.note}>
              Кнопка «Зафиксировать выплату» скрыта: протокол подтверждения получателем будет подключён
              отдельным этапом backend.
            </p>
          ) : null}
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
          {data.completed.slice(0, 20).map((row: SettlementCompleted) => (
            <Link key={`${row.id}-${row.paidAt}`} href={settlementAccrualHref(row)} className={hubStyles.row}>
              <div className={hubStyles.rowHeader}>
                <div>
                  <p className={hubStyles.rowTitle}>{formatMoneyRub(row.amount)}</p>
                  <p className={hubStyles.meta}>
                    {row.counterpartyName} · {completedDirectionLabel(row.direction)}
                  </p>
                </div>
                <StatusBadge label={bonusStatusLabel(row.status)} tone={bonusStatusTone(row.status)} />
              </div>
            </Link>
          ))}
        </>
      ) : null}

      {screen !== "overview" ? (
        <div className={hubStyles.actions}>
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </Button>
          <span className={hubStyles.meta}>Страница {page}</span>
          <Button type="button" variant="secondary" onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </Button>
        </div>
      ) : null}
    </div>
  );
}
