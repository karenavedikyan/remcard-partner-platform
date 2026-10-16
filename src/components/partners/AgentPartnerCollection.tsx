"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { getPartnershipUiActions, partnershipNeedsMyResponse } from "@/lib/partnership-rules";
import type { AgentListViewMode } from "@/components/partners/AgentR04ListToolbar";
import {
  partnerListDetail,
  partnerListSubtitle,
  partnerRowOfficialLine,
  partnerRowTitle,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import type { Partnership } from "@/lib/types";
import { AgentPartnerRecordActions } from "@/components/partners/AgentPartnerRecordActions";
import { RecordRowActions } from "@/components/agent-r03/RecordRowActions";
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
};

export function AgentPartnerCollection({
  partnerships,
  meId,
  viewMode,
  busyId,
  onRunAction,
  onUpdated,
  termRequests,
  onLoadTermRequests,
  expandedTermPartnershipId,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (viewMode === "cards") {
    return (
      <div className={styles.cardGrid} data-testid="agent-r04-partners-cards">
        {partnerships.map((partnership) => {
          const partner = partnershipPartnerProfile(partnership, meId);
          const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
          const actions = getPartnershipUiActions(partnership, meId);
          return (
            <article key={partnership.id} className={styles.partnerCard}>
              <div className={styles.cardTop}>
                <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
              </div>
              <h3 className={styles.cardTitle}>{partnerRowTitle(partnership, meId)}</h3>
              {partnerRowOfficialLine(partnership, meId) ? (
                <p className={styles.cardMeta}>Официально: {partnerRowOfficialLine(partnership, meId)}</p>
              ) : null}
              <p className={styles.cardMeta}>{partnerListSubtitle(partner)}</p>
              <p className={styles.cardDetail}>{partnerListDetail(partnership, meId)}</p>
              <div className={styles.cardActions}>
                <AgentPartnerRecordActions partnership={partnership} meId={meId} onUpdated={onUpdated} />
                {actions
                  .filter((a) => a.kind !== "waiting")
                  .slice(0, 2)
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
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div data-testid="agent-r04-partners-list">
      <div className={`${r03.collectionPanel} ${r03.mobileOnly}`}>
        {partnerships.map((partnership) => {
          const partner = partnershipPartnerProfile(partnership, meId);
          const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
          const actions = getPartnershipUiActions(partnership, meId);
          const needsResponse = partnershipNeedsMyResponse(partnership, meId);
          return (
            <article key={partnership.id} className={r03.mobileRecord} data-testid="agent-partner-mobile-row">
              <div className={r03.mobileRecordTop}>
                <div className={r03.mobileRecordMain}>
                  <p className={r03.mobileRecordTitle}>{partnerRowTitle(partnership, meId)}</p>
                  <p className={r03.meta}>{partnerListSubtitle(partner)}</p>
                  <p className={r03.meta}>{partnerListDetail(partnership, meId)}</p>
                  {needsResponse ? <p className={r03.meta}>Ожидает вашего решения</p> : null}
                </div>
              </div>
              <div className={r03.mobileRecordFooter}>
                <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
                <RecordRowActions
                  ariaLabel="Действия с партнёром"
                  variant="mobileFooter"
                  actions={[
                    ...actions
                      .filter((a) => a.kind !== "waiting")
                      .map((a) => ({
                        id: a.kind,
                        label: a.label,
                        disabled: busyId === partnership.id,
                        onClick: () => onRunAction(partnership.id, a.kind),
                      })),
                    {
                      id: "more",
                      label: "Ещё",
                      onClick: () => setExpandedId((id) => (id === partnership.id ? null : partnership.id)),
                    },
                  ]}
                />
              </div>
              {expandedId === partnership.id ? (
                <div className={styles.mobileMore}>
                  <AgentPartnerRecordActions partnership={partnership} meId={meId} onUpdated={onUpdated} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className={`${r03.tableWrap} ${r03.desktopOnly}`}>
        <table className={r03.collectionTable}>
          <thead>
            <tr>
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
              const actions = getPartnershipUiActions(partnership, meId);
              const termState = termRequests[partnership.id];
              const open = expandedId === partnership.id;
              return (
                <Fragment key={partnership.id}>
                  <tr>
                    <td>
                      <strong>{partnerRowTitle(partnership, meId)}</strong>
                      {partnerRowOfficialLine(partnership, meId) ? (
                        <small className={r03.collectionCaption}>
                          {partnerRowOfficialLine(partnership, meId)}
                        </small>
                      ) : null}
                      <small className={r03.collectionCaption}>{partnerListSubtitle(partner)}</small>
                    </td>
                    <td className={r03.collectionDetail}>{partnerListDetail(partnership, meId)}</td>
                    <td>
                      <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />
                    </td>
                    <td className={r03.collectionRowAction}>
                      <RecordRowActions
                        ariaLabel="Действия"
                        variant="listRow"
                        actions={[
                          ...actions
                            .filter((a) => a.kind !== "waiting")
                            .map((a) => ({
                              id: a.kind,
                              label: a.label,
                              disabled: busyId === partnership.id,
                              onClick: () => onRunAction(partnership.id, a.kind),
                            })),
                          {
                            id: "details",
                            label: open ? "Свернуть" : "Детали",
                            onClick: () => setExpandedId(open ? null : partnership.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                  {open ? (
                    <tr>
                      <td colSpan={4} className={styles.expandedRow}>
                        <div className={styles.expandedInner}>
                          <AgentPartnerRecordActions
                            partnership={partnership}
                            meId={meId}
                            onUpdated={onUpdated}
                          />
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
                          {partnership.terms.length ? (
                            <ul className={styles.termsList}>
                              {partnership.terms.map((term) => (
                                <li key={term.id}>
                                  {displayCategoryLabel(term.category, term.categoryLabel)} —{" "}
                                  {term.isExcluded ? "—" : `${term.storePercent}%`}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
