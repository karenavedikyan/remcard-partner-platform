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
import {
  cooperationActionLabel,
  termChangeActionLabel,
} from "@/components/partners/partner-cooperation-c1";
import r03 from "@/components/agent-r03/agent-r03.module.css";
import styles from "./AgentPartnerCollection.module.css";
import inviteStyles from "./AgentInvitationCollection.module.css";

type TermRequestState = {
  state: "idle" | "loading" | "loaded" | "error";
  requests: import("@/lib/types").TermChangeRequest[];
  error: string;
};

export type AgentPartnerCollectionPresentation = "default" | "invitations";

type Props = {
  partnerships: Partnership[];
  meId: string;
  viewMode: AgentListViewMode;
  busyId: string | null;
  onRunAction: (partnershipId: string, action: string) => void;
  onUpdated: () => void;
  /** Kept for hub wiring / tests; editor host lives on PartnersHub (single instance). */
  termRequests: Record<string, TermRequestState>;
  onLoadTermRequests: (partnershipId: string, trigger?: HTMLElement | null) => void;
  onCloseTermChange?: () => void;
  onTermDirtyChange?: (dirty: boolean) => void;
  expandedTermPartnershipId: string | null;
  /** When true, detail dialog yields focus/Escape to an overlying confirm. */
  suspendDetailFocusTrap?: boolean;
  /** Surface hub action errors inside the open detail sheet (not under the modal). */
  detailActionError?: string;
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
  /**
   * Additive presentation only. Default keeps active/overview/non-agent look.
   * `invitations` applies scoped invitation CSS — no filter/action/state changes.
   */
  presentationVariant?: AgentPartnerCollectionPresentation;
  /** Presentation hint for invitations surfaces (incoming/outgoing). Does not filter. */
  invitationFlowHint?: "incoming" | "outgoing" | null;
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
      data-partnership-id={partnership.id}
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
  termExpanded,
}: {
  partnership: Partnership;
  meId: string;
  busyId: string | null;
  onRunAction: (partnershipId: string, action: string) => void;
  onLoadTermRequests: (partnershipId: string, trigger?: HTMLElement | null) => void;
  termExpanded: boolean;
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
          data-partnership-id={partnership.id}
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
            aria-expanded={termExpanded}
            data-testid={`partner-term-change-${partnership.id}`}
            data-partnership-id={partnership.id}
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

export function AgentPartnerCollection(props: Props) {
  const {
    partnerships,
    meId,
    viewMode,
    busyId,
    onRunAction,
    onUpdated,
    onLoadTermRequests,
    expandedTermPartnershipId,
    suspendDetailFocusTrap = false,
    detailActionError = "",
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
    presentationVariant = "default",
    invitationFlowHint = null,
  } = props;

  const isInvitations = presentationVariant === "invitations";

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
      suspendFocusTrap={suspendDetailFocusTrap}
      actionError={detailActionError}
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

  const cardGridClass = isInvitations ? inviteStyles.cardGrid : styles.cardGrid;
  const partnerCardClass = (selected: boolean) =>
    isInvitations
      ? `${inviteStyles.partnerCard}${selected ? ` ${inviteStyles.partnerCardSelected}` : ""}`
      : `${styles.partnerCard}${selected ? ` ${styles.partnerCardSelected}` : ""}`;
  const cardSelectClass = isInvitations ? inviteStyles.cardSelectRow : styles.cardSelectRow;
  const cardBodyClass = isInvitations ? inviteStyles.cardBody : styles.cardBody;
  const cardTitleClass = isInvitations ? inviteStyles.cardTitle : styles.cardTitle;
  const cardMetaClass = isInvitations ? inviteStyles.cardMeta : styles.cardMeta;
  const cardFooterClass = isInvitations ? inviteStyles.cardFooter : styles.cardFooter;
  const tableWrapClass = isInvitations
    ? `${inviteStyles.tableWrap} ${styles.desktopOnly}`
    : `${styles.tableWrap} ${styles.desktopOnly}`;
  const dataTableClass = isInvitations ? inviteStyles.dataTable : styles.dataTable;
  const titleCellClass = isInvitations ? inviteStyles.titleCell : styles.titleCell;
  const detailCellClass = isInvitations ? inviteStyles.detailCell : styles.detailCell;
  const statusCellClass = isInvitations ? inviteStyles.statusCell : styles.statusCell;
  const actionCellClass = isInvitations ? inviteStyles.actionCell : styles.actionCell;
  const captionClass = isInvitations ? inviteStyles.caption : styles.caption;
  const workflowCellClass = isInvitations ? inviteStyles.workflowCell : styles.workflowCell;

  const listBody =
    viewMode === "cards" ? (
      <>
        {selectPageRow}
        <div
          className={cardGridClass}
          data-testid="agent-r04-partners-cards"
          data-partner-surface="cards"
        >
          {partnerships.map((partnership) => {
            const partner = partnershipPartnerProfile(partnership, meId);
            const officialLine = partnerCollectionOfficialLine(partnership, meId);
            const typeCaption = partnerTypeLabel(partner);
            const detail = partnerCollectionListDetail(partnership, meId);
            const isSelected = selectedIds.has(partnership.id);
            return (
              <article
                key={partnership.id}
                className={partnerCardClass(isSelected)}
                data-selected={isSelected ? "true" : "false"}
                data-testid={isInvitations ? "agent-invitation-card" : undefined}
              >
                <div className={cardSelectClass}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(partnership.id)}
                    aria-label="Выбрать карточку"
                  />
                  <PartnerCollectionStatusBadge status={partnership.status} />
                </div>
                <div className={cardBodyClass}>
                  <PartnerRowNameButton
                    partnership={partnership}
                    meId={meId}
                    onOpenDetails={(el) => openDetails(partnership.id, el)}
                    className={cardTitleClass}
                  />
                  {officialLine ? (
                    <p className={cardMetaClass} data-testid="partner-row-official-line">
                      Официально: {officialLine}
                    </p>
                  ) : null}
                  <p className={cardMetaClass} data-testid="partner-row-type-caption">
                    {typeCaption}
                  </p>
                  <p className={cardMetaClass} data-testid="partner-row-detail">
                    {detail}
                  </p>
                  <PartnerRowInlineWorkflow
                    partnership={partnership}
                    meId={meId}
                    busyId={busyId}
                    onRunAction={onRunAction}
                    onLoadTermRequests={onLoadTermRequests}
                    termExpanded={expandedTermPartnershipId === partnership.id}
                  />
                </div>
                <div className={cardFooterClass}>
                  <AgentPartnerWorkspaceActions
                    partnership={partnership}
                    meId={meId}
                    onUpdated={onUpdated}
                    variant="cardToolbar"
                    ariaLabel="Действия с партнёром"
                  />
                </div>
              </article>
            );
          })}
        </div>
        {footer}
      </>
    ) : (
      <div data-testid="agent-r04-partners-list">
        <div
          className={`${r03.collectionPanel} ${styles.mobileOnly}${isInvitations ? ` ${inviteStyles.mobileStack}` : ""}`}
          data-partner-surface="mobile"
        >
          {partnerships.map((partnership) => {
            const partner = partnershipPartnerProfile(partnership, meId);
            const needsResponse = partnershipNeedsMyResponse(partnership, meId);
            const officialLine = partnerCollectionOfficialLine(partnership, meId);
            const typeCaption = partnerTypeLabel(partner);
            const detail = partnerCollectionListDetail(partnership, meId);
            return (
              <article
                key={partnership.id}
                className={isInvitations ? inviteStyles.mobileRecord : r03.mobileRecord}
                data-testid="agent-partner-mobile-row"
              >
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
                      className={
                        isInvitations ? inviteStyles.mobileTitle : r03.mobileRecordTitle
                      }
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
                  termExpanded={expandedTermPartnershipId === partnership.id}
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
              </article>
            );
          })}
        </div>
        {selectPageRow}
        <div className={tableWrapClass} data-partner-surface="desktop">
          <table className={dataTableClass} data-testid="agent-r04-partners-table">
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
                const officialLine = partnerCollectionOfficialLine(partnership, meId);
                const typeCaption = partnerTypeLabel(partner);
                const detail = partnerCollectionListDetail(partnership, meId);
                return (
                  <Fragment key={partnership.id}>
                    <tr
                      data-testid="agent-r04-partners-table-row"
                      data-invitation-row={isInvitations ? "true" : undefined}
                    >
                      <td className={styles.selectCell}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(partnership.id)}
                          onChange={() => onToggleSelect(partnership.id)}
                          aria-label={`Выбрать ${partnerRowTitle(partnership, meId)}`}
                        />
                      </td>
                      <td className={titleCellClass}>
                        <PartnerRowNameButton
                          partnership={partnership}
                          meId={meId}
                          onOpenDetails={(el) => openDetails(partnership.id, el)}
                        />
                        {officialLine ? (
                          <small className={captionClass} data-testid="partner-row-official-line">
                            Официально: {officialLine}
                          </small>
                        ) : null}
                        <small className={captionClass} data-testid="partner-row-type-caption">
                          {typeCaption}
                        </small>
                      </td>
                      <td className={detailCellClass} data-testid="partner-row-detail">
                        {detail}
                      </td>
                      <td className={statusCellClass}>
                        <PartnerCollectionStatusBadge status={partnership.status} />
                      </td>
                      <td className={actionCellClass}>
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
                        <td colSpan={5} className={workflowCellClass}>
                          <PartnerRowInlineWorkflow
                            partnership={partnership}
                            meId={meId}
                            busyId={busyId}
                            onRunAction={onRunAction}
                            onLoadTermRequests={onLoadTermRequests}
                            termExpanded={expandedTermPartnershipId === partnership.id}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {footer}
      </div>
    );

  // Single composition: list/cards body + one detail dialog. Term-change editor is owned by PartnersHub.
  return (
    <div
      className={isInvitations ? inviteStyles.root : undefined}
      data-testid={isInvitations ? "agent-invitation-collection" : undefined}
      data-presentation={presentationVariant}
      data-invitation-flow={isInvitations ? invitationFlowHint ?? undefined : undefined}
    >
      {listBody}
      {detailDialog}
    </div>
  );
}
