"use client";

import { useMemo, useState } from "react";
import {
  filterReceivingAppeals,
  formatReceivingPaidRubFromKopecks,
  receivingStageLabelsFromSettings,
  receivingStatusFilterOptions,
  RECEIVING_LIST_SOURCE_OPTIONS,
  type ReceivingAppealsListResponse,
  type ReceivingAppealListRow,
  type ReceivingListBucket,
  type ReceivingListFilters,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingBulkActions, type ReceivingBulkAction, type ReceivingBulkContractState } from "./ReceivingBulkActions";
import styles from "./receiving.module.css";

/** P5 toolbar wired by P6 workspace — K1 batch via `postReceivingAppealsBatch`. */
export type ReceivingBulkCallbacks = {
  selectedIds: ReadonlySet<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleSelectAll: (ids: string[], checked: boolean) => void;
  onBulkAction: (action: ReceivingBulkAction) => void;
  contractState?: ReceivingBulkContractState;
  partialError?: string | null;
  batchNotice?: string | null;
};

export type ReceivingAppealsListProps = {
  data: ReceivingAppealsListResponse;
  filters?: ReceivingListFilters;
  onFiltersChange?: (next: ReceivingListFilters) => void;
  /** K1 paginated list — filters hit server; no client-side filter on partial page. */
  serverBackedFilters?: boolean;
  listHasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenAppeal?: (appealId: string) => void;
  onNavigateScan?: () => void;
  onNavigateManual?: () => void;
  onNavigateSettings?: () => void;
  onNavigateAnalytics?: () => void;
  readOnly?: boolean;
  bulk?: ReceivingBulkCallbacks;
  stageLabelById?: (row: ReceivingAppealListRow) => string;
};

const EMPTY_BUCKET_COPY: Record<
  ReceivingListBucket,
  { title: string; hint: string }
> = {
  active: {
    title: "Пока нет обращений",
    hint: "Сканируйте сертификат или добавьте клиента — обращение появится в списке.",
  },
  archive: {
    title: "В архиве пока пусто",
    hint: "Сюда попадают обращения, с которыми вы закончили работу в списке.",
  },
  trash: {
    title: "Корзина пуста",
    hint: "Удалённые обращения можно восстановить отсюда.",
  },
};

function formatAgeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн.`;
}

function rowSourceMeta(row: ReceivingAppealListRow): string {
  if (row.manualEntry) return "Добавлен вручную";
  if (row.certificateId) return row.certificateId;
  return "—";
}

function paidLabel(row: ReceivingAppealListRow): string | null {
  const rub = formatReceivingPaidRubFromKopecks(row.paidAmountKopecks);
  if (rub) return rub;
  if (row.paidAt) return "Оплачено";
  return null;
}

/** Exact stagePillClass mapping in the frozen client-appeals prototype. */
function stagePillClass(stageId: string): string {
  if (stageId === "sys_refused") return "ca-pill--danger";
  if (stageId === "sys_return") return "ca-pill--warn";
  if (stageId === "sys_paid" || stageId === "sys_shipped") return "ca-pill--good";
  return stageId === "sys_new" ? "" : "ca-pill--info";
}

export function ReceivingAppealsList({
  data,
  filters: controlledFilters,
  onFiltersChange,
  onOpenAppeal,
  onNavigateScan,
  onNavigateManual,
  onNavigateSettings,
  onNavigateAnalytics,
  readOnly = false,
  bulk,
  stageLabelById = (r) => r.stageId,
  serverBackedFilters = false,
  listHasMore = false,
  loadingMore = false,
  onLoadMore,
}: ReceivingAppealsListProps) {
  const [localFilters, setLocalFilters] = useState<ReceivingListFilters>({
    q: "",
    status: "Все статусы",
    source: "all",
    bucket: "active",
  });
  const filters = controlledFilters ?? localFilters;
  const setFilters = (next: ReceivingListFilters) => {
    if (onFiltersChange) onFiltersChange(next);
    else setLocalFilters(next);
  };

  const filtered = useMemo(
    () =>
      serverBackedFilters
        ? data.appeals
        : filterReceivingAppeals(data.appeals, filters, stageLabelById),
    [data.appeals, filters, serverBackedFilters, stageLabelById],
  );

  const statusOptions = useMemo(
    () =>
      serverBackedFilters
        ? receivingStageLabelsFromSettings(data.settings)
        : receivingStatusFilterOptions(data.appeals, stageLabelById),
    [data.appeals, data.settings, serverBackedFilters, stageLabelById, filters.status],
  );

  const bulkOn = !readOnly && Boolean(bulk);
  const selected = bulk?.selectedIds ?? new Set<string>();
  const visibleIds = filtered.map((a) => a.id);
  const selInView = bulkOn ? visibleIds.filter((id) => selected.has(id)) : [];
  const selCount = selInView.length;
  const allChecked =
    bulkOn && filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const someChecked = bulkOn && selCount > 0 && !allChecked && filtered.length > 0;
  const selectionOutsideView = bulkOn ? Math.max(0, selected.size - selCount) : 0;

  const emptyCopy = EMPTY_BUCKET_COPY[filters.bucket];

  return (
    <div className={`${styles.receivingShell} ca-section`} data-testid="ca-receiving-appeals-list">
      {data.kpis ? (
        <div className={styles.kpiStrip} role="list" data-testid="ca-receiving-kpi-strip">
          {(
            [
              ["В работе", data.kpis.inWork],
              ["Оплачено", data.kpis.paid],
              ["Отгружено", data.kpis.shipped],
              ["Конверсия в оплату", data.kpis.conv],
            ] as const
          ).map(([label, val]) => (
            <div key={label} className={`panel ${styles.kpi}`} role="listitem">
              <span className="small muted">{label}</span>
              <strong className={styles.kpiVal}>{String(val)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="ca-bucket-tabs ca-seg"
        role="tablist"
        aria-label="Список обращений"
        data-testid="ca-receiving-bucket-tabs"
      >
        {(
          [
            ["active", "Активные"],
            ["archive", "Архив"],
            ["trash", "Корзина"],
          ] as const
        ).map(([bucket, label]) => (
          <button
            key={bucket}
            type="button"
            role="tab"
            aria-selected={filters.bucket === bucket}
            className={filters.bucket === bucket ? "is-active" : ""}
            onClick={() => setFilters({ ...filters, bucket })}
          >
            {label}
          </button>
        ))}
      </div>

      {!readOnly ? (
        <div className={styles.toolbar} data-testid="ca-receiving-toolbar">
          <div className={styles.toolbarPrimary}>
            <button type="button" className="btn primary" data-ca-action="nav:scan" onClick={onNavigateScan}>
              Сканировать сертификат
            </button>
            <button type="button" className="btn ghost" data-ca-action="nav:manual" onClick={onNavigateManual}>
              Добавить клиента
            </button>
          </div>
          <div className="ca-quiet-links">
            <button type="button" className="btn ghost small-btn" onClick={onNavigateAnalytics}>
              Аналитика
            </button>
            <button type="button" className="btn ghost small-btn" onClick={onNavigateSettings}>
              Этапы и причины
            </button>
          </div>
        </div>
      ) : (
        <p className="notice">Только просмотр: изменять статусы и заметки нельзя.</p>
      )}

      {bulkOn ? (
        <ReceivingBulkActions
          bucket={filters.bucket}
          selectedCount={selected.size}
          visibleCount={filtered.length}
          allVisibleSelected={allChecked}
          someVisibleSelected={someChecked || selCount > 0}
          contractState={bulk?.contractState ?? "blocked"}
          partialError={bulk?.partialError ?? null}
          batchNotice={bulk?.batchNotice ?? null}
          selectionOutsideView={selectionOutsideView}
          onSelectAll={(checked) =>
            bulk?.onToggleSelectAll(
              filtered.map((a) => a.id),
              checked,
            )
          }
          onAction={(action) => bulk?.onBulkAction(action)}
        />
      ) : null}

      <div className="ca-filters panel" data-testid="ca-receiving-filters">
        <label className="field ca-search">
          Поиск
          <input
            type="search"
            data-ca-input="q"
            value={filters.q}
            placeholder="Имя, сертификат или ID"
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </label>
        <label className="field ca-filter">
          Статус
          <select
            data-ca-input="status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="field ca-filter">
          Источник
          <select
            data-ca-input="source"
            value={filters.source}
            onChange={(e) =>
              setFilters({
                ...filters,
                source: e.target.value as ReceivingListFilters["source"],
              })
            }
          >
            {RECEIVING_LIST_SOURCE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <section className="panel empty ca-empty" data-testid="ca-receiving-appeals-empty">
          <h2>{emptyCopy.title}</h2>
          <p className="muted">{emptyCopy.hint}</p>
          {filters.bucket !== "active" ? (
            <button type="button" className="btn ghost" onClick={() => setFilters({ ...filters, bucket: "active" })}>
              К активным
            </button>
          ) : !readOnly ? (
            <div className="ca-actions-row">
              <button type="button" className="btn primary" onClick={onNavigateScan}>
                Сканировать сертификат
              </button>
              <button type="button" className="btn ghost" onClick={onNavigateManual}>
                Добавить клиента
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <div className={`ca-rows ca-rows--bulk ${styles.rows}`}>
          <div className="ca-row ca-row--head" role="presentation">
            {bulkOn ? (
              <label className="ca-row-check ca-row-check--head ca-bulk-select-all-desktop">
                <input
                  type="checkbox"
                  aria-label="Выбрать все"
                  checked={allChecked}
                  onChange={(e) =>
                    bulk?.onToggleSelectAll(
                      filtered.map((a) => a.id),
                      e.target.checked,
                    )
                  }
                />
              </label>
            ) : null}
            <span className="ca-row-name small muted">Клиент</span>
            <span className="ca-row-request small muted">Запрос</span>
            <span className="ca-row-meta small muted">Источник</span>
            <span className="ca-row-status small muted">Статус</span>
            <span className="ca-row-amount small muted">Сумма</span>
            <span className="ca-row-age small muted">Создано</span>
            <span className="ca-chev" aria-hidden="true" />
          </div>
          {filtered.map((row) => {
            const paid = paidLabel(row);
            const checked = selected.has(row.id);
            return (
              <div key={row.id} className="ca-row-lane">
                {bulkOn ? (
                  <label className="ca-row-check">
                    <input
                      type="checkbox"
                      aria-label={`Выбрать ${row.clientName}`}
                      checked={checked}
                      onChange={(e) => bulk?.onToggleRow(row.id, e.target.checked)}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="ca-row"
                  data-ca-action={`open:${row.id}`}
                  onClick={() => onOpenAppeal?.(row.id)}
                >
                  <span className="ca-row-name">
                    <strong>{row.clientName}</strong>
                  </span>
                  <span className="ca-row-request muted small">{row.interest || row.id}</span>
                  <span className="ca-row-meta muted small">{rowSourceMeta(row)}</span>
                  <span className="ca-row-status">
                    <span className={`pill ${stagePillClass(row.stageId)}`}>{stageLabelById(row)}</span>
                  </span>
                  <span className={`ca-row-amount${paid ? "" : " ca-amount--empty"}`}>{paid ?? "—"}</span>
                  <span className="ca-row-age muted small">{formatAgeSince(row.createdAt)}</span>
                  <span className="ca-chev" aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {listHasMore && onLoadMore ? (
        <div className="ca-form-actions" data-testid="ca-receiving-load-more">
          <button type="button" className="btn ghost" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Загрузка…" : "Загрузить ещё"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
