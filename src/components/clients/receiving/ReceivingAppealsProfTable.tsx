"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  filterProfAppealsClient,
  profAppealRowSubtitle,
  profRowSourceLabel,
  profStageStatusClass,
  type ProfAppealListRow,
  type ProfListFilters,
} from "@/lib/clients-parity/prof-appeals-adapter";
import {
  formatReceivingPaidRubFromKopecks,
  receivingManualChannelOptions,
  receivingStageDisplayLabel,
  receivingStageLabelsFromSettings,
  receivingStatusFilterOptions,
  type ReceivingAppealListRow,
  type ReceivingAppealsListResponse,
  type ReceivingListBucket,
  type ReceivingManualChannel,
} from "@/lib/clients-parity/receiving-appeals-api";
import type { ReceivingBulkCallbacks } from "./ReceivingAppealsList";
import { ReceivingBulkActions } from "./ReceivingBulkActions";
import { ReceivingIcon } from "./ReceivingIcons";
import { useCopyDisplayedValue } from "./useCopyDisplayedValue";
import styles from "./receiving.module.css";

const createdDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Europe/Moscow" });

export type ReceivingAppealsProfTableProps = {
  data: ReceivingAppealsListResponse;
  profRows: ProfAppealListRow[];
  remCardMatchCount?: number;
  filters: ProfListFilters;
  onFiltersChange: (next: ProfListFilters) => void;
  serverBackedFilters?: boolean;
  onOpenAppeal?: (appealId: string) => void;
  onOpenSources?: () => void;
  onOpenPartnerFields?: () => void;
  readOnly?: boolean;
  bulk?: ReceivingBulkCallbacks;
  rowWritable?: (row: ProfAppealListRow) => boolean;
  branchLabelOf?: (row: ProfAppealListRow) => string | null;
  stageLabelById?: (row: ProfAppealListRow) => string;
  bulkConfirmSlot?: ReactNode;
  bulkEditSlot?: ReactNode;
  listHasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  scanOnly?: boolean;
  onNavigateScan?: () => void;
  onNavigateManual?: () => void;
  onNavigateSettings?: () => void;
  onNavigateAnalytics?: () => void;
  onShowAllBranches?: () => void;
};

function NumberCopy({
  label,
  value,
  copyId,
  onCopy,
  copiedKey,
  tone,
  cellClass,
}: {
  label: string;
  value: string | null;
  copyId: string;
  onCopy: (key: string, text: string) => void;
  copiedKey: string | null;
  tone?: "green";
  cellClass?: string;
}) {
  const display = value?.trim() || "—";
  return (
    <div
      className={`number-cell ${cellClass ?? ""}${tone === "green" ? " cert-green" : ""}`}
    >
      <span className="number-label">{label}</span>
      <NumberValueDisplay value={display} />
      <button
        type="button"
        className="number-copy btn ghost"
        aria-label={`Копировать ${label}`}
        disabled={display === "—"}
        onClick={(e) => {
          e.stopPropagation();
          void onCopy(copyId, display);
        }}
      >
        {copiedKey === copyId ? "✓" : <ReceivingIcon name="copy" />}
      </button>
    </div>
  );
}

function NumberValueDisplay({ value }: { value: string }) {
  return <span className={`number-value${value === "—" ? " muted" : ""}`}>{value}</span>;
}

export function ReceivingAppealsProfTable({
  data,
  profRows,
  remCardMatchCount,
  filters,
  onFiltersChange,
  serverBackedFilters = false,
  onOpenAppeal,
  onOpenSources,
  readOnly = false,
  bulk,
  rowWritable,
  branchLabelOf,
  stageLabelById = (r) => r.stageLabel ?? r.stageId,
  bulkConfirmSlot,
  bulkEditSlot,
  listHasMore = false,
  loadingMore = false,
  onLoadMore,
  scanOnly = false,
  onNavigateScan,
  onNavigateManual,
  onNavigateSettings,
  onNavigateAnalytics,
  onShowAllBranches,
}: ReceivingAppealsProfTableProps) {
  const channels: ReceivingManualChannel[] = receivingManualChannelOptions(data.settings);
  const sourceSelectOptions = useMemo(() => {
    const opts = [{ key: "all", label: "Все источники" }];
    const seen = new Set<string>(["all"]);
    for (const c of channels) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      opts.push({ key: c.key, label: c.label });
    }
    return opts;
  }, [channels]);

  const requestOptions = useMemo(() => {
    const set = new Set<string>(["Все"]);
    const active = filters.requestFilter?.trim();
    if (active && active !== "Все") set.add(active);
    for (const r of profRows) set.add(r.requestText?.trim() || "—");
    return [...set];
  }, [profRows, filters.requestFilter]);

  const statusOptions = useMemo(
    () =>
      serverBackedFilters
        ? receivingStageLabelsFromSettings(data.settings)
        : receivingStatusFilterOptions(
            profRows as ReceivingAppealListRow[],
            (row) => stageLabelById(row as ProfAppealListRow),
          ),
    [data.settings, profRows, serverBackedFilters, stageLabelById],
  );

  const filtered = useMemo(() => {
    if (serverBackedFilters) return profRows;
    return filterProfAppealsClient(profRows, filters);
  }, [profRows, filters, serverBackedFilters]);

  const listTotal = data.kpis?.total ?? profRows.length;
  const hasFilters = Boolean(
    filters.q.trim() ||
      filters.status !== "Все статусы" ||
      (filters.source && filters.source !== "all") ||
      filters.remCardOnly ||
      (filters.requestFilter && filters.requestFilter !== "Все") ||
      (filters.appealSourceKey && filters.appealSourceKey !== "all"),
  );
  const emptyBucket = !hasFilters && !onShowAllBranches && !listHasMore && filters.bucket !== "active" ? filters.bucket : null;

  const remcardCount =
    remCardMatchCount ?? profRows.filter((r) => r.remCard.inCabinet).length;

  const isWritable = (row: ProfAppealListRow) => (rowWritable ? rowWritable(row) : true);
  const writableRows = filtered.filter(isWritable);
  const bulkOn = !readOnly && Boolean(bulk) && (writableRows.length > 0 || (bulk?.selectedIds.size ?? 0) > 0);
  const selected = bulk?.selectedIds ?? new Set<string>();
  const { copy, copiedKey } = useCopyDisplayedValue();

  const headCheckRef = useRef<HTMLInputElement | null>(null);
  const allChecked =
    bulkOn && writableRows.length > 0 && writableRows.every((a) => selected.has(a.id));
  const someChecked = bulkOn && selected.size > 0 && !allChecked;
  useEffect(() => {
    if (headCheckRef.current) headCheckRef.current.indeterminate = someChecked;
  }, [someChecked, allChecked]);

  const selectAll = (checked: boolean) =>
    bulk?.onToggleSelectAll(
      writableRows.map((a) => a.id),
      checked,
    );

  const kpiItems = data.kpis
    ? ([
        ["В работе", data.kpis.inWork],
        ["Оплачено", data.kpis.paid],
        ["Отгружено", data.kpis.shipped],
        ["Конверсия в оплату", data.kpis.conv],
      ] as const)
    : null;

  return (
    <div
      className={`${styles.receivingShell} ca-section prof-appeals-wrap`}
      data-testid="ca-receiving-appeals-list"
    >
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
            onClick={() => onFiltersChange({ ...filters, bucket: bucket as ReceivingListBucket })}
          >
            {label}
          </button>
        ))}
      </div>

      {kpiItems ? (
        <div className={styles.kpiStrip} role="list" data-testid="ca-receiving-kpi-strip">
          {kpiItems.map(([label, val]) => (
            <div key={label} className={`panel ${styles.kpi}`} role="listitem">
              <span className="small muted">{label}</span>
              <strong className={styles.kpiVal}>{String(val)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {!readOnly || scanOnly ? (
        <div className={styles.toolbar} data-testid="ca-receiving-toolbar">
          <div className={styles.toolbarPrimary}>
            <button type="button" className="btn primary" data-ca-action="nav:scan" onClick={onNavigateScan}>
              Сканировать сертификат
            </button>
            {readOnly ? null : (
              <button type="button" className="btn ghost" data-ca-action="nav:manual" onClick={onNavigateManual}>
                Добавить клиента
              </button>
            )}
          </div>
          <div className="ca-quiet-links">
            <button
              type="button"
              className="btn ghost ca-quiet-btn"
              data-testid="ca-receiving-nav-analytics"
              onClick={onNavigateAnalytics}
            >
              <ReceivingIcon name="bar-chart" /> Аналитика
            </button>
            {readOnly ? null : (
              <button
                type="button"
                className="btn ghost ca-quiet-btn"
                data-testid="ca-receiving-nav-settings"
                onClick={onNavigateSettings}
              >
                <ReceivingIcon name="settings" /> Этапы и причины
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="notice">Только просмотр: изменять статусы и заметки нельзя.</p>
      )}

      <div className="filters panel prof-filters" data-testid="ca-prof-filters">
        <div className="prof-filters-primary">
        <label className="field searchbox search-inner prof-filter-search">
          Поиск по всем полям
          <input
            type="search"
            data-ca-input="q"
            value={filters.q}
            placeholder="Название, ID клиента, сертификат, номер 1С…"
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
          />
          <ReceivingIcon name="search" data-icon="search" />
        </label>
        <label className="field prof-filter-request">
          Запрос
          <select
            value={filters.requestFilter ?? "Все"}
            data-testid="ca-prof-filter-request"
            onChange={(e) => onFiltersChange({ ...filters, requestFilter: e.target.value })}
          >
            {requestOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="field prof-filter-status">
          Статус
          <select
            data-ca-input="status"
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="field prof-filter-source" id="source-filter">
          Источник обращения
          <select
            data-ca-input="source"
            value={filters.appealSourceKey ?? "all"}
            data-testid="ca-prof-filter-manual-source"
            onChange={(e) => onFiltersChange({ ...filters, appealSourceKey: e.target.value })}
          >
            {sourceSelectOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        </div>
        <div className="prof-filters-secondary">
          <label className="remcard-filter" data-testid="ca-remcard-filter">
            <input
              type="checkbox"
              checked={Boolean(filters.remCardOnly)}
              onChange={(e) => onFiltersChange({ ...filters, remCardOnly: e.target.checked })}
            />
            Только клиенты с RemCard
            <span className="remcard-filter-count">{remcardCount}</span>
          </label>
          <div className="prof-filter-actions" data-testid="ca-prof-filter-actions">
            <button type="button" className="btn ghost" data-testid="ca-prof-sources" onClick={onOpenSources}>
              Источники
            </button>
            <button
              type="button"
              className="btn ghost"
              data-testid="ca-prof-partner-fields"
              disabled
              title="Справочник внешних полей — в карточке обращения; отдельная настройка в списке запланирована"
            >
              Поля партнёра
            </button>
          </div>
        </div>
      </div>

      <div className="prof-list-head-row">
        <h1 className="prof-list-heading">
          Обращения{" "}
          <span className="pill muted prof-count-pill" data-testid="ca-prof-appeals-count">
            {serverBackedFilters ? `${filtered.length} из ${listTotal}` : `${filtered.length} из ${profRows.length}`}
          </span>
        </h1>
      </div>

      {bulkOn ? bulkConfirmSlot : null}
      {bulkOn ? (
        <ReceivingBulkActions
          bucket={filters.bucket}
          selectedCount={selected.size}
          contractState={bulk?.contractState ?? "blocked"}
          partialError={bulk?.partialError ?? null}
          batchNotice={bulk?.batchNotice ?? null}
          selectionOutsideView={0}
          onAction={(action) => bulk?.onBulkAction(action)}
        />
      ) : null}
      {bulkOn ? bulkEditSlot : null}

      <div className="prof-table-wrap" data-testid="ca-prof-table-wrap">
        <div className="prof-table-head" id="table-head">
          {bulkOn ? (
            <label className="check select-all">
              <input
                ref={headCheckRef}
                type="checkbox"
                aria-label="Выбрать все в списке"
                checked={allChecked}
                onChange={(e) => selectAll(e.target.checked)}
              />
            </label>
          ) : (
            <span className="check" aria-hidden="true" />
          )}
          <span>Обращение / клиент</span>
          <span className="status-heading">Статус</span>
          <span>Запрос</span>
          <span>№ сертификата</span>
          <span>Номер заказа в 1С</span>
          <span>Источник</span>
          <span>Ответственный</span>
          <span>Кабинет</span>
          <span className="row-action-head" aria-hidden="true" />
        </div>
        <div id="rows">
          {filtered.length === 0 ? (
            <section className="panel empty ca-empty" data-testid="ca-receiving-appeals-empty">
              <h2>{emptyBucket === "archive" ? "В архиве пока пусто" : emptyBucket === "trash" ? "Корзина пуста" : "По выбранным фильтрам обращений нет"}</h2>
              {emptyBucket ? (
                <>
                  <p className="muted">
                    {emptyBucket === "archive"
                      ? "Сюда попадают обращения, с которыми вы закончили работу в списке."
                      : "Удалённые обращения можно восстановить отсюда."}
                  </p>
                  <button type="button" className="btn ghost" onClick={() => onFiltersChange({ ...filters, bucket: "active" })}>
                    К активным
                  </button>
                </>
              ) : null}
              {onShowAllBranches ? (
                <button type="button" className="btn ghost" data-testid="ca-receiving-show-all-branches" onClick={onShowAllBranches}>
                  Показать все филиалы
                </button>
              ) : null}
            </section>
          ) : (
            filtered.map((row) => {
              const branch = branchLabelOf?.(row) ?? null;
              const statusLabel =
                receivingStageDisplayLabel(row.stageId, data.settings, row.stageLabel) ||
                stageLabelById(row);
              const sourceLabel = profRowSourceLabel(row);
              const referrer = row.originKind === "CERTIFICATE" ? row.referrerDisplayName?.trim() : null;
              const amount = formatReceivingPaidRubFromKopecks(row.paidAmountKopecks);
              const date = new Date(row.createdAt);
              const dateLabel = Number.isFinite(date.getTime()) ? createdDate.format(date) : null;
              const writable = isWritable(row);
              return (
                <div key={row.id} className="prof-table-row" data-testid={`ca-prof-row-${row.id}`}>
                  {bulkOn ? (
                    writable ? (
                      <label className="check pick">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          aria-label={`Выбрать ${row.appealTitle || row.clientName}`}
                          onChange={(e) => bulk?.onToggleRow(row.id, e.target.checked)}
                        />
                      </label>
                    ) : (
                      <span className="check pick" data-testid="ca-row-view-only" />
                    )
                  ) : (
                    <span className="check pick" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    className="prof-name-cell"
                    data-ca-action={`open:${row.id}`}
                    onClick={() => onOpenAppeal?.(row.id)}
                  >
                    <strong className="prof-name-title">{row.appealTitle?.trim() || row.clientName}</strong>
                    <small className="muted prof-name-sub">{profAppealRowSubtitle(row, branch ? null : undefined)}</small>
                    {branch ? (
                      <small className="ca-row-branch muted" data-testid="ca-row-branch">
                        {branch}
                      </small>
                    ) : null}
                    {amount ? <small className="prof-name-sub" data-testid="ca-prof-paid-amount">Сумма: {amount}</small> : null}
                    {dateLabel ? <time className="muted prof-name-sub" dateTime={row.createdAt}>Создано: {dateLabel}</time> : null}
                  </button>
                  <span
                    className={`prof-row-status appeal-status ${profStageStatusClass(row.stageId)} pill`}
                    title={statusLabel}
                  >
                    {statusLabel}
                  </span>
                  <span className="prof-row-request muted small">{row.requestText?.trim() || "—"}</span>
                  <NumberCopy
                    label="№ сертификата"
                    value={row.certificatePromoCode}
                    copyId={`${row.id}:cert`}
                    onCopy={copy}
                    copiedKey={copiedKey}
                    tone="green"
                    cellClass="certificate-cell"
                  />
                  <NumberCopy
                    label="Номер заказа в 1С"
                    value={row.erpDocumentNumber}
                    copyId={`${row.id}:1c`}
                    onCopy={copy}
                    copiedKey={copiedKey}
                    cellClass="one-c-cell"
                  />
                  <span className="row-source muted small">
                    <span className="source-caption">Источник: </span>
                    {sourceLabel}
                    {referrer ? <small className={styles.profReferrer}>Направил: {referrer}</small> : null}
                  </span>
                  <span className="row-assignee small">
                    <span className="number-label">Ответственный</span>
                    {row.responsible?.displayLabel?.trim() || "—"}
                  </span>
                  <span className="prof-row-account small" data-testid="ca-prof-account">
                    <span className="number-label">Кабинет</span>
                    {row.remCard.inCabinet ? (
                      <>
                        <span aria-hidden="true">✓</span> Есть в RemCard
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="row-action btn ghost icon"
                    aria-label="Открыть"
                    onClick={() => onOpenAppeal?.(row.id)}
                  >
                    ›
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

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
