"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { getPartnershipUiActions, partnershipNeedsMyResponse } from "@/lib/partnership-rules";
import { partnershipActionIconId } from "@/lib/agent-r04/partnership-action-icons";
import type { AgentListViewMode } from "@/components/partners/AgentR04ListToolbar";
import {
  partnerListDetail,
  partnerListSpecOnly,
  partnerListSubtitle,
  partnerRowOfficialLine,
  partnerRowTitle,
  partnerTermsDetail,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import type { Partnership } from "@/lib/types";
import { AgentPartnerWorkspaceActions } from "@/components/partners/AgentPartnerWorkspaceActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { TermChangePanel } from "@/components/partners/TermChangePanel";
import type { RecordRowAction } from "@/components/agent-r03/RecordRowActions";
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

function businessActions(partnership: Partnership, meId: string) {
  return getPartnershipUiActions(partnership, meId).filter((a) => a.kind !== "waiting");
}

function trailingSurfaceActions(
  partnership: Partnership,
  meId: string,
  open: boolean,
  onToggleDetails: () => void,
): RecordRowAction[] {
  const trailing: RecordRowAction[] = [
    {
      id: partnershipActionIconId("details"),
      label: open ? "Свернуть" : "Детали",
      onClick: onToggleDetails,
    },
  ];
  if (businessActions(partnership, meId).length > 0) {
    trailing.push({
      id: partnershipActionIconId("more"),
      label: "Ещё",
      onClick: onToggleDetails,
    });
  }
  return trailing;
}

function ExpandedPartnerDetails({
  partnership,
  meId,
  busyId,
  onRunAction,
  onUpdated,
  onLoadTermRequests,
  expandedTermPartnershipId,
  termState,
}: {
  partnership: Partnership;
  meId: string;
  busyId: string | null;
  onRunAction: (partnershipId: string, action: string) => void;
  onUpdated: () => void;
  onLoadTermRequests: (id: string) => void;
  expandedTermPartnershipId: string | null;
  termState: TermRequestState | undefined;
}) {
  const actions = getPartnershipUiActions(partnership, meId);
  const termsLine = partnerTermsDetail(partnership);
  return (
    <div className={styles.expandedInner}>
      {actions
        .filter((a) => a.kind !== "waiting")
        .map((action) => (
          <Button
            key={action.kind}
            variant={action.variant ?? "secondary"}
            disabled={busyId === partnership.id}
            onClick={() => onRunAction(partnership.id, action.kind)}
          >
            {action.label}
          </Button>
        ))}
      {partnership.status === "ACTIVE" ? (
        <>
          <Button
            variant="secondary"
            disabled={busyId === partnership.id}
            onClick={() => onLoadTermRequests(partnership.id)}
          >
            Изменение условий
          </Button>
          <Link href="/certificates" className={styles.certLink}>
            Создать сертификат
          </Link>
        </>
      ) : null}
      {termsLine ? <p className={styles.termsLine}>{termsLine}</p> : null}
      {actions
        .filter((a) => a.kind === "waiting")
        .map((a) => (
          <p key={a.message} className={styles.waiting}>
            {a.message}
          </p>
        ))}
      {expandedTermPartnershipId === partnership.id && termState ? (
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
      ) : null}
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  if (viewMode === "cards") {
    return (
      <>
        <div className={styles.cardGrid} data-testid="agent-r04-partners-cards">
          {partnerships.map((partnership) => {
            const partner = partnershipPartnerProfile(partnership, meId);
            const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
            const open = expandedId === partnership.id;
            const toggle = () => setExpandedId(open ? null : partnership.id);
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
                  <h3 className={styles.cardTitle}>{partnerRowTitle(partnership, meId)}</h3>
                  {partnerRowOfficialLine(partnership, meId) ? (
                    <p className={styles.cardMeta}>Официально: {partnerRowOfficialLine(partnership, meId)}</p>
                  ) : null}
                  <p className={styles.cardMeta}>{partnerListSubtitle(partner)}</p>
                  <p className={styles.cardMeta}>{partnerListSpecOnly(partner)}</p>
                </div>
                <div className={styles.cardFooter}>
                  <AgentPartnerWorkspaceActions
                    partnership={partnership}
                    meId={meId}
                    onUpdated={onUpdated}
                    variant="cardToolbar"
                    ariaLabel="Действия с партнёром"
                    trailingActions={trailingSurfaceActions(partnership, meId, open, toggle)}
                  />
                </div>
                {open ? (
                  <div className={styles.mobileMore}>
                    <ExpandedPartnerDetails
                      partnership={partnership}
                      meId={meId}
                      busyId={busyId}
                      onRunAction={onRunAction}
                      onUpdated={onUpdated}
                      onLoadTermRequests={onLoadTermRequests}
                      expandedTermPartnershipId={expandedTermPartnershipId}
                      termState={termRequests[partnership.id]}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {footer}
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
          const open = expandedId === partnership.id;
          const toggle = () => setExpandedId(open ? null : partnership.id);
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
                  <p className={r03.mobileRecordTitle}>{partnerRowTitle(partnership, meId)}</p>
                  <p className={r03.meta}>{partnerListSubtitle(partner)}</p>
                  <p className={r03.meta}>{partnerListSpecOnly(partner)}</p>
                  {needsResponse ? <p className={r03.meta}>Ожидает вашего решения</p> : null}
                </div>
              </div>
              <div className={r03.mobileRecordFooter}>
                <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
                <AgentPartnerWorkspaceActions
                  partnership={partnership}
                  meId={meId}
                  onUpdated={onUpdated}
                  variant="mobileFooter"
                  ariaLabel="Действия с партнёром"
                  trailingActions={trailingSurfaceActions(partnership, meId, open, toggle)}
                />
              </div>
              {open ? (
                <div className={styles.mobileMore}>
                  <ExpandedPartnerDetails
                    partnership={partnership}
                    meId={meId}
                    busyId={busyId}
                    onRunAction={onRunAction}
                    onUpdated={onUpdated}
                    onLoadTermRequests={onLoadTermRequests}
                    expandedTermPartnershipId={expandedTermPartnershipId}
                    termState={termRequests[partnership.id]}
                  />
                </div>
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
              const open = expandedId === partnership.id;
              const toggle = () => setExpandedId(open ? null : partnership.id);
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
                      <strong>{partnerRowTitle(partnership, meId)}</strong>
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
                        trailingActions={trailingSurfaceActions(partnership, meId, open, toggle)}
                      />
                    </td>
                  </tr>
                  {open ? (
                    <tr>
                      <td colSpan={5} className={styles.expandedRow}>
                        <ExpandedPartnerDetails
                          partnership={partnership}
                          meId={meId}
                          busyId={busyId}
                          onRunAction={onRunAction}
                          onUpdated={onUpdated}
                          onLoadTermRequests={onLoadTermRequests}
                          expandedTermPartnershipId={expandedTermPartnershipId}
                          termState={termState}
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
}
