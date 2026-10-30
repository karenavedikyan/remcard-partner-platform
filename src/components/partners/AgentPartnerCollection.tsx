"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { getPartnershipUiActions, partnershipNeedsMyResponse } from "@/lib/partnership-rules";
import type { AgentListViewMode } from "@/components/partners/AgentR04ListToolbar";
import {
  partnerCollectionListDetail,
  partnerCollectionOfficialLine,
  partnerRowTitle,
  partnerTypeLabel,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import type { Partnership } from "@/lib/types";
import { AgentPartnerWorkspaceActions } from "@/components/partners/AgentPartnerWorkspaceActions";
import { PartnerPartnershipDetailDialog } from "@/components/partners/PartnerPartnershipDetailDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { TermChangePanel } from "@/components/partners/TermChangePanel";
import {
  cooperationActionLabel,
  cooperationPartnerTitle,
  termChangeActionLabel,
} from "@/components/partners/partner-cooperation-c1";
import r03 from "@/components/agent-r03/agent-r03.module.css";
import styles from "./AgentPartnerCollection.module.css";

type TermRequestState = {
  state: "idle" | "loading" | "loaded" | "error";
  requests: import("@/lib/types").TermChangeRequest[];
  error: string;
};

type Props = {
  partnerships: Partnership[];
  meId: string;
  viewMode: AgentListViewMode;
  busyId: string | null;
  onRunAction: (partnershipId: string, action: string) => void;
  onUpdated: () => void;
  termRequests: Record<string, TermRequestState>;
  onLoadTermRequests: (partnershipId: string, trigger?: HTMLElement | null) => void;
  onCloseTermChange?: () => void;
  onTermDirtyChange?: (dirty: boolean) => void;
  expandedTermPartnershipId: string | null;
  /** Deep-link target already paged into `partnerships` — open its detail dialog once. */
  focusPartnershipId?: string | null;
  /** Acknowledge one-shot focus so list refresh / page-size cannot re-open after close. */
  onFocusPartnershipConsumed?: (partnershipId: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[], checked: boolean) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function PartnerRowNameButton({
  partnership,
  meId,
  onOpenDetails,
  className,
}: {
  partnership: Partnership;
  meId: string;
  onOpenDetails: (trigger: HTMLButtonElement) => void;
  className?: string;
}) {
  const title = partnerRowTitle(partnership, meId);
  return (
    <button
      type="button"
      className={`${styles.nameButton} ${className ?? ""}`}
      onClick={(e) => onOpenDetails(e.currentTarget)}
      data-testid="partner-row-name-button"
      aria-label={`Подробнее о партнёре ${title}`}
    >
      {title}
    </button>
  );
}

/** Collection-local host so muted/paused badge FG can meet WCAG without changing StatusBadge. */
function PartnerCollectionStatusBadge({ status }: { status: string }) {
  const tone = partnershipStatusTone(status);
  const label = PARTNERSHIP_STATUS_LABELS[status] ?? status;
  return (
    <span
      className={tone === "neutral" ? styles.statusNeutral : undefined}
      data-testid="partner-row-status"
      data-status-tone={tone}
    >
      <StatusBadge label={label} tone={tone} />
    </span>
  );
}

function rowShowsInlineWorkflow(partnership: Partnership, meId: string): boolean {
  const actions = getPartnershipUiActions(partnership, meId);
  return (
    partnership.status === "ACTIVE" ||
    actions.some((a) => a.kind === "waiting") ||
    actions.some((a) => a.kind !== "waiting")
  );
}

function PartnerRowInlineWorkflow({
  partnership,
  meId,
  busyId,
  onRunAction,
  onLoadTermRequests,
}: {
  partnership: Partnership;
  meId: string;
  busyId: string | null;
  onRunAction: (partnershipId: string, action: string) => void;
  onLoadTermRequests: (partnershipId: string, trigger?: HTMLElement | null) => void;
}) {
  const actions = getPartnershipUiActions(partnership, meId);
  const waiting = actions.filter((a) => a.kind === "waiting");
  const buttons = actions.filter((a) => a.kind !== "waiting");
  const disabled = busyId === partnership.id;

  if (!buttons.length && !waiting.length && partnership.status !== "ACTIVE") {
    return null;
  }

  return (
    <div className={styles.inlineWorkflow} data-testid="partner-row-inline-workflow">
      {buttons.map((action) => (
        <Button
          key={action.kind}
          variant={action.variant ?? "secondary"}
          disabled={disabled}
          data-testid={`partner-action-${action.kind}`}
          onClick={() => onRunAction(partnership.id, action.kind)}
        >
          {cooperationActionLabel(action.kind) ?? action.label}
        </Button>
      ))}
      {partnership.status === "ACTIVE" ? (
        <>
          <Button
            variant="secondary"
            disabled={disabled}
            data-testid={`partner-term-change-${partnership.id}`}
            onClick={(event) => onLoadTermRequests(partnership.id, event.currentTarget)}
          >
            {termChangeActionLabel()}
          </Button>
          <Link href="/certificates" className={styles.certLink}>
            Создать сертификат
          </Link>
        </>
      ) : null}
      {waiting.map((a) => (
        <p key={a.message} className={styles.waiting}>
          {a.message}
        </p>
      ))}
    </div>
  );
}

function TermChangeRow({
  partnership,
  meId,
  termState,
  onLoadTermRequests,
  onCloseTermChange,
  onTermDirtyChange,
  onUpdated,
  colSpan,
}: {
  partnership: Partnership;
  meId: string;
  termState: TermRequestState | undefined;
  onLoadTermRequests: (id: string, trigger?: HTMLElement | null) => void;
  onCloseTermChange?: () => void;
  onTermDirtyChange?: (dirty: boolean) => void;
  onUpdated: () => void;
  colSpan?: number;
}) {
  if (!termState) return null;
  const inner = (
    <TermChangePanel
      partnership={partnership}
      meId={meId}
      partnerTitle={cooperationPartnerTitle(partnership, meId)}
      requests={termState.state === "loaded" ? termState.requests : null}
      loadState={
        termState.state === "idle"
          ? "loading"
          : termState.state === "loaded"
            ? "loaded"
            : termState.state
      }
      loadError={termState.error}
      onReload={() => onLoadTermRequests(partnership.id)}
      onChanged={() => {
        onUpdated();
        onLoadTermRequests(partnership.id);
      }}
      onDirtyChange={onTermDirtyChange}
      onCloseRequest={onCloseTermChange}
    />
  );
  if (colSpan) {
    return (
      <tr data-testid="partner-term-change-row">
        <td colSpan={colSpan} className={styles.expandedRow}>
          {inner}
        </td>
      </tr>
    );
  }
  return <div className={styles.mobileMore}>{inner}</div>;
}

export function AgentPartnerCollection(props: Props) {
  const {
    partnerships,
    meId,
    viewMode,
    busyId,
    onRunAction,
    onUpdated,
    termRequests,
    onLoadTermRequests,
    onCloseTermChange,
    onTermDirtyChange,
    expandedTermPartnershipId,
    focusPartnershipId = null,
    onFocusPartnershipConsumed,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    page,
    pageSize,
    totalCount,
    onPageChange,
    onPageSizeChange,
  } = props;

  const [detailPartnershipId, setDetailPartnershipId] = useState<string | null>(null);
  const detailNameButtonRef = useRef<HTMLButtonElement | null>(null);
  const consumedFocusIdRef = useRef<string | null>(null);
  const detailPartnership = useMemo(
    () => partnerships.find((p) => p.id === detailPartnershipId) ?? null,
    [partnerships, detailPartnershipId],
  );

  const openDetails = useCallback((partnershipId: string, trigger: HTMLButtonElement) => {
    detailNameButtonRef.current = trigger;
    setDetailPartnershipId(partnershipId);
  }, []);
  const closeDetails = useCallback(() => setDetailPartnershipId(null), []);

  // One-shot deep-link open: apply once per focus id, then acknowledge so page-size/refresh
  // cannot reopen after the user explicitly closes.
  useEffect(() => {
    if (!focusPartnershipId) {
      consumedFocusIdRef.current = null;
      return;
    }
    if (consumedFocusIdRef.current === focusPartnershipId) return;
    if (!partnerships.some((p) => p.id === focusPartnershipId)) return;
    setDetailPartnershipId(focusPartnershipId);
    consumedFocusIdRef.current = focusPartnershipId;
    onFocusPartnershipConsumed?.(focusPartnershipId);
  }, [focusPartnershipId, partnerships, onFocusPartnershipConsumed]);

  const pageIds = useMemo(() => partnerships.map((p) => p.id), [partnerships]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const footer = (
    <div className={styles.listFooter} data-testid="agent-r04-list-pagination">
      <label className={styles.pageSizeControl}>
        <span>На странице</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Записей на странице"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className={styles.pageStatus}>
        Страница {page + 1} из {pageCount}
      </span>
      <span className={styles.pageNav}>
        <Button type="button" variant="secondary" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
          Назад
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={page + 1 >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Далее
        </Button>
      </span>
    </div>
  );

  const selectPageRow =
    pageIds.length > 0 ? (
      <div className={styles.selectPageRow} data-testid="agent-r04-select-page-row">
        <label className={styles.selectPageLabel}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onToggleSelectAll(pageIds, e.target.checked)}
            aria-label={`Выбрать страницу (${pageIds.length})`}
          />
          <span>Выбрать страницу ({pageIds.length})</span>
        </label>
      </div>
    ) : null;

  const detailDialog = (
    <PartnerPartnershipDetailDialog
      partnership={detailPartnership}
      meId={meId}
      open={detailPartnershipId !== null}
      onClose={closeDetails}
      returnFocusRef={detailNameButtonRef}
      busy={Boolean(detailPartnership && busyId === detailPartnership.id)}
      onRunAction={
        detailPartnership
          ? (action) => {
              onRunAction(detailPartnership.id, action);
            }
          : undefined
      }
      onOpenTermChange={
        detailPartnership
          ? () => {
              const id = detailPartnership.id;
              closeDetails();
              onLoadTermRequests(id, detailNameButtonRef.current);
            }
          : undefined
      }
    />
  );

  if (viewMode === "cards") {
    return (
      <>
        {selectPageRow}
        <div className={styles.cardGrid} data-testid="agent-r04-partners-cards">
          {partnerships.map((partnership) => {
            const partner = partnershipPartnerProfile(partnership, meId);
            const officialLine = partnerCollectionOfficialLine(partnership, meId);
            const typeCaption = partnerTypeLabel(partner);
            const detail = partnerCollectionListDetail(partnership, meId);
            const isSelected = selectedIds.has(partnership.id);
            return (
              <article
                key={partnership.id}
                className={`${styles.partnerCard}${isSelected ? ` ${styles.partnerCardSelected}` : ""}`}
                data-selected={isSelected ? "true" : "false"}
              >
                <div className={styles.cardSelectRow}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(partnership.id)}
                    aria-label="Выбрать карточку"
                  />
                  <PartnerCollectionStatusBadge status={partnership.status} />
                </div>
                <div className={styles.cardBody}>
                  <PartnerRowNameButton
                    partnership={partnership}
                    meId={meId}
                    onOpenDetails={(el) => openDetails(partnership.id, el)}
                    className={styles.cardTitle}
                  />
                  {officialLine ? (
                    <p className={styles.cardMeta} data-testid="partner-row-official-line">
                      Официально: {officialLine}
                    </p>
                  ) : null}
                  <p className={styles.cardMeta} data-testid="partner-row-type-caption">
                    {typeCaption}
                  </p>
                  <p className={styles.cardMeta} data-testid="partner-row-detail">
                    {detail}
                  </p>
                  <PartnerRowInlineWorkflow
                    partnership={partnership}
                    meId={meId}
                    busyId={busyId}
                    onRunAction={onRunAction}
                    onLoadTermRequests={onLoadTermRequests}
                  />
                </div>
                <div className={styles.cardFooter}>
                  <AgentPartnerWorkspaceActions
                    partnership={partnership}
                    meId={meId}
                    onUpdated={onUpdated}
                    variant="cardToolbar"
                    ariaLabel="Действия с партнёром"
                  />
                </div>
                {expandedTermPartnershipId === partnership.id ? (
                  <TermChangeRow
                    partnership={partnership}
                    meId={meId}
                    termState={termRequests[partnership.id]}
                    onLoadTermRequests={onLoadTermRequests}
                    onCloseTermChange={onCloseTermChange}
                    onTermDirtyChange={onTermDirtyChange}
                    onUpdated={onUpdated}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
        {footer}
        {detailDialog}
      </>
    );
  }

  return (
    <div data-testid="agent-r04-partners-list">
      <div className={`${r03.collectionPanel} ${styles.mobileOnly}`}>
        {partnerships.map((partnership) => {
          const partner = partnershipPartnerProfile(partnership, meId);
          const needsResponse = partnershipNeedsMyResponse(partnership, meId);
          const officialLine = partnerCollectionOfficialLine(partnership, meId);
          const typeCaption = partnerTypeLabel(partner);
          const detail = partnerCollectionListDetail(partnership, meId);
          return (
            <article key={partnership.id} className={r03.mobileRecord} data-testid="agent-partner-mobile-row">
              <div className={r03.mobileRecordTop}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(partnership.id)}
                  onChange={() => onToggleSelect(partnership.id)}
                  aria-label="Выбрать партнёра"
                />
                <div className={r03.mobileRecordMain}>
                  <PartnerRowNameButton
                    partnership={partnership}
                    meId={meId}
                    onOpenDetails={(el) => openDetails(partnership.id, el)}
                    className={r03.mobileRecordTitle}
                  />
                  {officialLine ? (
                    <p className={r03.meta} data-testid="partner-row-official-line">
                      Официально: {officialLine}
                    </p>
                  ) : null}
                  <p className={r03.meta} data-testid="partner-row-type-caption">
                    {typeCaption}
                  </p>
                  <p className={r03.meta} data-testid="partner-row-detail">
                    {detail}
                  </p>
                  {needsResponse ? <p className={r03.meta}>Ожидает вашего решения</p> : null}
                </div>
              </div>
              <PartnerRowInlineWorkflow
                partnership={partnership}
                meId={meId}
                busyId={busyId}
                onRunAction={onRunAction}
                onLoadTermRequests={onLoadTermRequests}
              />
              <div className={r03.mobileRecordFooter}>
                <PartnerCollectionStatusBadge status={partnership.status} />
                <AgentPartnerWorkspaceActions
                  partnership={partnership}
                  meId={meId}
                  onUpdated={onUpdated}
                  variant="mobileFooter"
                  ariaLabel="Действия с партнёром"
                />
              </div>
              {expandedTermPartnershipId === partnership.id ? (
                <TermChangeRow
                  partnership={partnership}
                  meId={meId}
                  termState={termRequests[partnership.id]}
                  onLoadTermRequests={onLoadTermRequests}
                  onCloseTermChange={onCloseTermChange}
                  onTermDirtyChange={onTermDirtyChange}
                  onUpdated={onUpdated}
                />
              ) : null}
            </article>
          );
        })}
      </div>
      {selectPageRow}
      <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
        <table className={styles.dataTable} data-testid="agent-r04-partners-table">
          <colgroup>
            <col className={styles.colSelect} />
            <col className={styles.colName} />
            <col className={styles.colDetail} />
            <col className={styles.colStatus} />
            <col className={styles.colActions} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.selectCell}>
                <input
                  type="checkbox"
                  aria-label="Выбрать все на странице"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAll(pageIds, e.target.checked)}
                />
              </th>
              <th>Название</th>
              <th>Подробности</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {partnerships.map((partnership) => {
              const partner = partnershipPartnerProfile(partnership, meId);
              const termState = termRequests[partnership.id];
              const officialLine = partnerCollectionOfficialLine(partnership, meId);
              const typeCaption = partnerTypeLabel(partner);
              const detail = partnerCollectionListDetail(partnership, meId);
              return (
                <Fragment key={partnership.id}>
                  <tr data-testid="agent-r04-partners-table-row">
                    <td className={styles.selectCell}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(partnership.id)}
                        onChange={() => onToggleSelect(partnership.id)}
                        aria-label={`Выбрать ${partnerRowTitle(partnership, meId)}`}
                      />
                    </td>
                    <td className={styles.titleCell}>
                      <PartnerRowNameButton
                        partnership={partnership}
                        meId={meId}
                        onOpenDetails={(el) => openDetails(partnership.id, el)}
                      />
                      {officialLine ? (
                        <small className={styles.caption} data-testid="partner-row-official-line">
                          Официально: {officialLine}
                        </small>
                      ) : null}
                      <small className={styles.caption} data-testid="partner-row-type-caption">
                        {typeCaption}
                      </small>
                    </td>
                    <td className={styles.detailCell} data-testid="partner-row-detail">
                      {detail}
                    </td>
                    <td className={styles.statusCell}>
                      <PartnerCollectionStatusBadge status={partnership.status} />
                    </td>
                    <td className={styles.actionCell}>
                      <AgentPartnerWorkspaceActions
                        partnership={partnership}
                        meId={meId}
                        onUpdated={onUpdated}
                        variant="listRow"
                        ariaLabel="Действия"
                      />
                    </td>
                  </tr>
                  {rowShowsInlineWorkflow(partnership, meId) ? (
                    <tr className={styles.workflowRow}>
                      <td colSpan={5} className={styles.workflowCell}>
                        <PartnerRowInlineWorkflow
                          partnership={partnership}
                          meId={meId}
                          busyId={busyId}
                          onRunAction={onRunAction}
                          onLoadTermRequests={onLoadTermRequests}
                        />
                      </td>
                    </tr>
                  ) : null}
                  {expandedTermPartnershipId === partnership.id ? (
                    <TermChangeRow
                      partnership={partnership}
                      meId={meId}
                      termState={termState}
                      onLoadTermRequests={onLoadTermRequests}
                      onCloseTermChange={onCloseTermChange}
                      onTermDirtyChange={onTermDirtyChange}
                      onUpdated={onUpdated}
                      colSpan={5}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
      {detailDialog}
    </div>
  );
}
