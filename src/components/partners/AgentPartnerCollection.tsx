"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { getPartnershipUiActions, partnershipAgentSegment, partnershipNeedsMyResponse } from "@/lib/partnership-rules";
import type { AgentListViewMode } from "@/components/partners/AgentR04ListToolbar";
import {
  partnerCollectionListDetail,
  partnerCollectionOfficialLine,
  partnerListSubtitle,
  partnerRowTitle,
  partnerSpecializationHint,
  partnerTermsDetail,
  partnerTypeLabel,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import type { PartnershipPartnerProfile } from "@/lib/agent-r04/partner-filters";
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
import activeStyles from "./AgentActiveCollection.module.css";

export type AgentPartnerCollectionPresentation = "default" | "invitations" | "active";

/** Active cards/list: frozen R1 type · city + spec line (collection scope only). */
function partnerCollectionActiveRowLines(partner: PartnershipPartnerProfile) {
  return {
    typeCityLine: partnerListSubtitle(partner),
    specLine: partnerSpecializationHint(partner) || "Специализация не указана",
  };
}

/** Readonly avatar from partnership profile props only (no Hub synthesis). */
function partnerCollectionAvatarUrl(partner: PartnershipPartnerProfile): string | null {
  const photo = partner.photoUrl?.trim();
  if (photo) return photo;
  const logo = partner.organizationLogoUrl?.trim();
  return logo || null;
}

export function resolveActivePartnerPresentation(
  presentationVariant: AgentPartnerCollectionPresentation,
  partnerships: Partnership[],
): boolean {
  if (presentationVariant === "invitations") return false;
  if (presentationVariant === "active") return true;
  return (
    partnerships.length > 0 &&
    partnerships.every((p) => partnershipAgentSegment(p.status) === "active")
  );
}

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
  /** General cabinet prototype: compact rows, full lifecycle actions in detail. */
  compactCooperation?: boolean;
  /** Presentation hint for invitations surfaces (incoming/outgoing). Does not filter. */
  invitationFlowHint?: "incoming" | "outgoing" | null;
};

function CompactCooperationActions({
  partnership, busyId, onOpen, onLoadTermRequests, children,
}: {
  partnership: Partnership;
  busyId: string | null;
  onOpen: (trigger: HTMLButtonElement) => void;
  onLoadTermRequests: (id: string, trigger?: HTMLElement | null) => void;
  children?: ReactNode;
}) {
  return (
    <div className={activeStyles.compactActions} data-testid="partner-compact-actions">
      <button type="button" className={activeStyles.openCardButton}
        aria-label="Открыть карточку" title="Открыть карточку"
        onClick={(event) => onOpen(event.currentTarget)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      </button>
      {children}
      {partnership.status === "ACTIVE" ? (
        <Button type="button" variant="secondary" disabled={busyId === partnership.id}
          data-testid={`partner-term-change-${partnership.id}`}
          data-partnership-id={partnership.id}
          onClick={(event) => onLoadTermRequests(partnership.id, event.currentTarget)}>
          {termChangeActionLabel()}
        </Button>
      ) : null}
    </div>
  );
}

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
    compactCooperation = false,
  } = props;

  const isInvitations = presentationVariant === "invitations";
  const isActiveSkin = resolveActivePartnerPresentation(presentationVariant, partnerships);
  const isCompact = compactCooperation && isActiveSkin;

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

  // Accepted/rejected rows leave the incoming collection. Do not leave an invisible
  // dialog's Escape/focus listeners alive after its partnership disappeared.
  useEffect(() => {
    if (detailPartnershipId && !detailPartnership) setDetailPartnershipId(null);
  }, [detailPartnershipId, detailPartnership]);

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
      compactCooperation={isCompact}
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

  const cardGridClass = isInvitations ? inviteStyles.cardGrid : isActiveSkin ? activeStyles.cardGrid : styles.cardGrid;
  const partnerCardClass = (selected: boolean) => {
    if (isInvitations) {
      return `${inviteStyles.partnerCard}${selected ? ` ${inviteStyles.partnerCardSelected}` : ""}`;
    }
    if (isActiveSkin) {
      return `${activeStyles.partnerCard}${selected ? ` ${activeStyles.partnerCardSelected}` : ""}`;
    }
    return `${styles.partnerCard}${selected ? ` ${styles.partnerCardSelected}` : ""}`;
  };
  const cardSelectClass = isInvitations
    ? inviteStyles.cardSelectRow
    : isActiveSkin
      ? activeStyles.cardSelectRow
      : styles.cardSelectRow;
  const cardBodyClass = isInvitations
    ? inviteStyles.cardBody
    : isActiveSkin
      ? activeStyles.cardBody
      : styles.cardBody;
  const cardTitleClass = isInvitations
    ? inviteStyles.cardTitle
    : isActiveSkin
      ? activeStyles.cardTitle
      : styles.cardTitle;
  const cardMetaClass = isInvitations
    ? inviteStyles.cardMeta
    : isActiveSkin
      ? activeStyles.cardMeta
      : styles.cardMeta;
  const cardFooterClass = isInvitations
    ? inviteStyles.cardFooter
    : isActiveSkin
      ? activeStyles.cardFooter
      : styles.cardFooter;
  const tableWrapClass = isInvitations
    ? `${inviteStyles.tableWrap} ${styles.desktopOnly}`
    : isActiveSkin
      ? `${activeStyles.tableWrap} ${styles.desktopOnly}`
      : `${styles.tableWrap} ${styles.desktopOnly}`;
  const dataTableClass = isInvitations
    ? inviteStyles.dataTable
    : isActiveSkin
      ? activeStyles.dataTable
      : styles.dataTable;
  const titleCellClass = isInvitations
    ? inviteStyles.titleCell
    : isActiveSkin
      ? activeStyles.titleCell
      : styles.titleCell;
  const detailCellClass = isInvitations
    ? inviteStyles.detailCell
    : isActiveSkin
      ? activeStyles.detailCell
      : styles.detailCell;
  const statusCellClass = isInvitations
    ? inviteStyles.statusCell
    : isActiveSkin
      ? activeStyles.statusCell
      : styles.statusCell;
  const actionCellClass = isInvitations
    ? inviteStyles.actionCell
    : isActiveSkin
      ? activeStyles.actionCell
      : styles.actionCell;
  const captionClass = isInvitations
    ? inviteStyles.caption
    : isActiveSkin
      ? activeStyles.caption
      : styles.caption;
  const workflowCellClass = isInvitations
    ? inviteStyles.workflowCell
    : isActiveSkin
      ? activeStyles.workflowCell
      : styles.workflowCell;

  if (isActiveSkin && partnerships.length === 0) {
    return (
      <div
        className={activeStyles.root}
        data-testid="agent-active-collection"
        data-presentation="active"
      >
        <p className={activeStyles.cardMeta} data-testid="agent-active-empty" role="status">
          Действующих партнёров пока нет
        </p>
        {detailDialog}
      </div>
    );
  }

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
            const activeMeta = isActiveSkin ? partnerCollectionActiveRowLines(partner) : null;
            const typeCaption = activeMeta ? activeMeta.typeCityLine : partnerTypeLabel(partner);
            const detail = activeMeta
              ? activeMeta.specLine
              : partnerCollectionListDetail(partnership, meId);
            const avatarUrl = isActiveSkin ? partnerCollectionAvatarUrl(partner) : null;
            const isSelected = selectedIds.has(partnership.id);
            return (
              <article
                key={partnership.id}
                className={partnerCardClass(isSelected)}
                data-selected={isSelected ? "true" : "false"}
                data-testid={
                  isInvitations
                    ? "agent-invitation-card"
                    : isActiveSkin
                      ? "agent-active-card"
                      : undefined
                }
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
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className={activeStyles.partnerAvatar}
                      data-testid="partner-row-avatar"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      onLoad={(event) => {
                        event.currentTarget.style.removeProperty("display");
                      }}
                    />
                  ) : null}
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
                  <p
                    className={
                      isActiveSkin
                        ? `${cardMetaClass} ${activeStyles.typeCityLine}`
                        : cardMetaClass
                    }
                    data-testid="partner-row-type-caption"
                  >
                    {typeCaption}
                  </p>
                  <p
                    className={
                      isActiveSkin
                        ? `${cardMetaClass} ${activeStyles.specLine}`
                        : cardMetaClass
                    }
                    data-testid="partner-row-detail"
                  >
                    {detail}
                  </p>
                  {isActiveSkin && partnerTermsDetail(partnership) ? (
                    <div className={activeStyles.termsBlock} data-testid="partner-row-terms-block">
                      <p className={activeStyles.termsTitle}>Условия</p>
                      <p className={activeStyles.termsPreview} data-testid="partner-row-terms-preview">
                        {partnerTermsDetail(partnership)}
                      </p>
                    </div>
                  ) : null}
                  {isCompact ? (
                    <CompactCooperationActions partnership={partnership} busyId={busyId}
                      onOpen={(el) => openDetails(partnership.id, el)}
                      onLoadTermRequests={onLoadTermRequests} />
                  ) : <PartnerRowInlineWorkflow
                    partnership={partnership}
                    meId={meId}
                    busyId={busyId}
                    onRunAction={onRunAction}
                    onLoadTermRequests={onLoadTermRequests}
                    termExpanded={expandedTermPartnershipId === partnership.id}
                  />}
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
            const activeMeta = isActiveSkin ? partnerCollectionActiveRowLines(partner) : null;
            const typeCaption = activeMeta ? activeMeta.typeCityLine : partnerTypeLabel(partner);
            const detail = activeMeta
              ? activeMeta.specLine
              : partnerCollectionListDetail(partnership, meId);
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
                    <p
                      className={isActiveSkin ? `${r03.meta} ${activeStyles.specLine}` : r03.meta}
                      data-testid="partner-row-detail"
                    >
                      {detail}
                    </p>
                    {isActiveSkin && partnerTermsDetail(partnership) ? (
                      <div className={activeStyles.termsBlock} data-testid="partner-row-terms-block">
                        <p className={activeStyles.termsTitle}>Условия</p>
                        <p className={activeStyles.termsPreview} data-testid="partner-row-terms-preview">
                          {partnerTermsDetail(partnership)}
                        </p>
                      </div>
                    ) : null}
                    {needsResponse && !isActiveSkin ? (
                      <p className={r03.meta}>Ожидает вашего решения</p>
                    ) : null}
                  </div>
                </div>
                  {isCompact ? (
                    <CompactCooperationActions partnership={partnership} busyId={busyId}
                      onOpen={(el) => openDetails(partnership.id, el)}
                      onLoadTermRequests={onLoadTermRequests} />
                  ) : <PartnerRowInlineWorkflow
                  partnership={partnership}
                  meId={meId}
                  busyId={busyId}
                  onRunAction={onRunAction}
                  onLoadTermRequests={onLoadTermRequests}
                  termExpanded={expandedTermPartnershipId === partnership.id}
                />}
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
          <table className={`${dataTableClass} ${isCompact ? activeStyles.compactTable : ""}`} data-testid="agent-r04-partners-table">
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
                const activeMeta = isActiveSkin ? partnerCollectionActiveRowLines(partner) : null;
                const typeCaption = activeMeta && !isCompact ? activeMeta.typeCityLine : partnerTypeLabel(partner);
                const detail = isCompact
                  ? [partner.city, partnerSpecializationHint(partner)].filter(Boolean).join(" · ") || "Нет дополнительных данных"
                  : activeMeta
                  ? activeMeta.specLine
                  : partnerCollectionListDetail(partnership, meId);
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
                      <td className={detailCellClass}>
                        <span data-testid="partner-row-detail">{detail}</span>
                        {isActiveSkin && !isCompact && partnerTermsDetail(partnership) ? (
                          <div
                            className={activeStyles.termsBlock}
                            data-testid="partner-row-terms-block"
                          >
                            <p className={activeStyles.termsTitle}>Условия</p>
                            <p
                              className={activeStyles.termsPreview}
                              data-testid="partner-row-terms-preview"
                            >
                              {partnerTermsDetail(partnership)}
                            </p>
                          </div>
                        ) : null}
                      </td>
                      <td className={statusCellClass}>
                        <PartnerCollectionStatusBadge status={partnership.status} />
                      </td>
                      <td className={actionCellClass}>
                        {isCompact ? (
                          <CompactCooperationActions partnership={partnership} busyId={busyId}
                            onOpen={(el) => openDetails(partnership.id, el)}
                            onLoadTermRequests={onLoadTermRequests}>
                            <AgentPartnerWorkspaceActions partnership={partnership} meId={meId}
                              onUpdated={onUpdated} variant="listRow" ariaLabel="Действия" />
                          </CompactCooperationActions>
                        ) : <AgentPartnerWorkspaceActions
                          partnership={partnership}
                          meId={meId}
                          onUpdated={onUpdated}
                          variant="listRow"
                          ariaLabel="Действия"
                        />}
                      </td>
                    </tr>
                    {!isCompact && rowShowsInlineWorkflow(partnership, meId) ? (
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
      className={isInvitations ? inviteStyles.root : isActiveSkin ? activeStyles.root : undefined}
      data-testid={
        isInvitations
          ? "agent-invitation-collection"
          : isActiveSkin
            ? "agent-active-collection"
            : undefined
      }
      data-presentation={
        isInvitations ? "invitations" : isActiveSkin ? "active" : presentationVariant
      }
      data-invitation-flow={isInvitations ? invitationFlowHint ?? undefined : undefined}
    >
      {listBody}
      {detailDialog}
    </div>
  );
}
