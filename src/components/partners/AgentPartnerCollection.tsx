"use client";

import Link from "next/link";
import { Fragment, useMemo, useRef, useState } from "react";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { getPartnershipUiActions, partnershipNeedsMyResponse } from "@/lib/partnership-rules";
import type { AgentListViewMode } from "@/components/partners/AgentR04ListToolbar";
import {
  partnerListSpecOnly,
  partnerListSubtitle,
  partnerRowOfficialLine,
  partnerRowTitle,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import type { Partnership } from "@/lib/types";
import { AgentPartnerWorkspaceActions } from "@/components/partners/AgentPartnerWorkspaceActions";
import { PartnerPartnershipDetailDialog } from "@/components/partners/PartnerPartnershipDetailDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { TermChangePanel } from "@/components/partners/TermChangePanel";
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
  onLoadTermRequests: (partnershipId: string) => void;
  expandedTermPartnershipId: string | null;
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
  onLoadTermRequests: (partnershipId: string) => void;
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
          onClick={() => onRunAction(partnership.id, action.kind)}
        >
          {action.label}
        </Button>
      ))}
      {partnership.status === "ACTIVE" ? (
        <>
          <Button variant="secondary" disabled={disabled} onClick={() => onLoadTermRequests(partnership.id)}>
            Изменение условий
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
  onUpdated,
  colSpan,
}: {
  partnership: Partnership;
  meId: string;
  termState: TermRequestState | undefined;
  onLoadTermRequests: (id: string) => void;
  onUpdated: () => void;
  colSpan?: number;
}) {
  if (!termState) return null;
  const inner = (
    <TermChangePanel
      partnership={partnership}
      meId={meId}
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
    expandedTermPartnershipId,
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
  const detailPartnership = useMemo(
    () => partnerships.find((p) => p.id === detailPartnershipId) ?? null,
    [partnerships, detailPartnershipId],
  );

  const openDetails = (partnershipId: string, trigger: HTMLButtonElement) => {
    detailNameButtonRef.current = trigger;
    setDetailPartnershipId(partnershipId);
  };
  const closeDetails = () => setDetailPartnershipId(null);

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
    />
  );

  if (viewMode === "cards") {
    return (
      <>
        <div className={styles.cardGrid} data-testid="agent-r04-partners-cards">
          {partnerships.map((partnership) => {
            const partner = partnershipPartnerProfile(partnership, meId);
            const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
            return (
              <article key={partnership.id} className={styles.partnerCard}>
                <div className={styles.cardSelectRow}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(partnership.id)}
                    onChange={() => onToggleSelect(partnership.id)}
                    aria-label="Выбрать карточку"
                  />
                  <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
                </div>
                <div className={styles.cardBody}>
                  <PartnerRowNameButton
                    partnership={partnership}
                    meId={meId}
                    onOpenDetails={(el) => openDetails(partnership.id, el)}
                    className={styles.cardTitle}
                  />
                  {partnerRowOfficialLine(partnership, meId) ? (
                    <p className={styles.cardMeta}>Официально: {partnerRowOfficialLine(partnership, meId)}</p>
                  ) : null}
                  <p className={styles.cardMeta}>{partnerListSubtitle(partner)}</p>
                  <p className={styles.cardMeta}>{partnerListSpecOnly(partner)}</p>
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
          const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
          const needsResponse = partnershipNeedsMyResponse(partnership, meId);
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
                  <p className={r03.meta}>{partnerListSubtitle(partner)}</p>
                  <p className={r03.meta}>{partnerListSpecOnly(partner)}</p>
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
                <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
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
              const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
              const termState = termRequests[partnership.id];
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
                      {partnerRowOfficialLine(partnership, meId) ? (
                        <small className={styles.caption}>{partnerRowOfficialLine(partnership, meId)}</small>
                      ) : null}
                      <small className={styles.caption}>{partnerListSubtitle(partner)}</small>
                    </td>
                    <td className={styles.detailCell}>{partnerListSpecOnly(partner)}</td>
                    <td>
                      <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
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
