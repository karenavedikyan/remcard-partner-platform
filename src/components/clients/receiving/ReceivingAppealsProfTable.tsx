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
  receivingManualChannelOptions,
  receivingStageDisplayLabel,
  type ReceivingAppealsListResponse,
  type ReceivingManualChannel,
} from "@/lib/clients-parity/receiving-appeals-api";
import type { ReceivingBulkCallbacks } from "./ReceivingAppealsList";
import { ReceivingBulkActions } from "./ReceivingBulkActions";
import { ReceivingIcon } from "./ReceivingIcons";
import { useCopyDisplayedValue } from "./useCopyDisplayedValue";
import styles from "./receiving.module.css";

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
  branchOptions?: Array<{ id: string; label: string }>;
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
  onOpenPartnerFields,
  readOnly = false,
  bulk,
  rowWritable,
  branchLabelOf,
  stageLabelById = (r) => r.stageLabel ?? r.stageId,
  bulkConfirmSlot,
  bulkEditSlot,
  branchOptions = [],
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
    for (const r of profRows) set.add(r.requestText?.trim() || "—");
    return [...set];
  }, [profRows]);

  const filtered = useMemo(() => {
    if (serverBackedFilters) return profRows;
    return filterProfAppealsClient(profRows, filters);
  }, [profRows, filters, serverBackedFilters]);

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

  return (
    <div className={`${styles.receivingShell} ca-section prof-appeals-wrap`} data-testid="ca-prof-appeals-table">
      <h1 className="prof-list-heading">
        Обращения{" "}
        <span className="pill muted prof-count-pill" data-testid="ca-prof-appeals-count">
          {filtered.length} из {profRows.length || filtered.length}
        </span>
      </h1>

      <div className="filters panel prof-filters" data-testid="ca-prof-filters">
        <label className="field searchbox search-inner">
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
        {branchOptions.length > 0 ? (
          <label className="field">
            Филиал
            <select
              value={filters.branchScope === "all" ? "__all__" : filters.branchId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__all__") onFiltersChange({ ...filters, branchScope: "all", branchId: undefined });
                else onFiltersChange({ ...filters, branchId: v, branchScope: undefined });
              }}
            >
              <option value="__all__">Все доступные</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          Запрос
          <select
            value={filters.requestFilter ?? "Все"}
            onChange={(e) => onFiltersChange({ ...filters, requestFilter: e.target.value })}
          >
            {requestOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="field" id="source-filter">
          Источник
          <select
            data-ca-input="source"
            value={filters.appealSourceKey ?? "all"}
            onChange={(e) => onFiltersChange({ ...filters, appealSourceKey: e.target.value })}
          >
            {sourceSelectOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="remcard-filter" data-testid="ca-remcard-filter">
          <input
            type="checkbox"
            checked={Boolean(filters.remCardOnly)}
            onChange={(e) => onFiltersChange({ ...filters, remCardOnly: e.target.checked })}
          />
          Только клиенты с RemCard
          <span className="remcard-filter-count">{remcardCount}</span>
        </label>
      </div>

      <div className="prof-list-toolbar">
        <div className="prof-list-toolbar-actions">
          <button type="button" className="btn ghost" data-testid="ca-prof-sources" onClick={onOpenSources}>
            Источники
          </button>
          <button
            type="button"
            className="btn ghost"
            data-testid="ca-prof-partner-fields"
            onClick={onOpenPartnerFields}
          >
            Поля партнёра
          </button>
        </div>
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

      <div className="table-wrap" data-testid="ca-prof-table-wrap">
        <div className="table-head" id="table-head">
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
            <p className="notice prof-zero" data-testid="ca-prof-zero">
              По выбранным фильтрам обращений нет.
            </p>
          ) : (
            filtered.map((row) => {
              const branch = branchLabelOf?.(row) ?? null;
              const statusLabel =
                receivingStageDisplayLabel(row.stageId, data.settings, row.stageLabel) ||
                stageLabelById(row);
              const sourceLabel = profRowSourceLabel(row);
              const writable = isWritable(row);
              return (
                <div key={row.id} className="entry row-lane" data-testid={`ca-prof-row-${row.id}`}>
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
                    className="entry row name-cell"
                    data-ca-action={`open:${row.id}`}
                    onClick={() => onOpenAppeal?.(row.id)}
                  >
                    <div className="title-line name-button">
                      <strong>{row.appealTitle?.trim() || row.clientName}</strong>
                    </div>
                    <small className="muted">{profAppealRowSubtitle(row, branch)}</small>
                  </button>
                  <span className={`row-state appeal-status ${profStageStatusClass(row.stageId)} pill`}>
                    {statusLabel}
                  </span>
                  <span className="request muted small">{row.requestText?.trim() || "—"}</span>
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
                  </span>
                  <span className="row-assignee small">{row.responsible?.displayLabel?.trim() || "—"}</span>
                  <span className="row-account small" data-testid="ca-prof-account">
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
    </div>
  );
}