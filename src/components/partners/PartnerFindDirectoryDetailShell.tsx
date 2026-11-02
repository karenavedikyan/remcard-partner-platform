"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import type { PartnerSearchResult } from "@/lib/types";
import {
  findDirectoryDetailInviteLabel,
  searchResultDetailCatalogLine,
  searchResultDetailStagesLine,
  searchResultDirectionGroups,
  searchResultInviteFoot,
  searchResultTypeLabel,
} from "@/components/partners/PartnerSearchResultCard";
import {
  formatPartnerSearchInlineTermLine,
  getPartnerSearchInlineTermsViewerEpoch,
  readPartnerCertificateProgramForSearchCard,
  resetPartnerSearchInlineTermsCache,
} from "@/components/partners/partnerSearchResultInlineTerms";
import styles from "./PartnerFindDirectoryDetailShell.module.css";

/** Public disclaimer for published certificate-program summary (live API data — not demo-labeled). */
export const PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER =
  "Это общий процент на скидку клиенту и бонус агенту, не гарантированный доход. Итоговые условия партнёр предложит после приглашения.";

export type PartnerFindDirectoryDetailShellProps = {
  partner: PartnerSearchResult;
  onBack: () => void;
  onInvite: () => void;
  inviteDisabled?: boolean;
  /** Frozen qt() block — AGENT-only; default false (no fetch/render). */
  showAgentTerms?: boolean;
  /** Optional parent snapshot (same certificate-program-summary contract as search card). */
  agentTermsSnapshot?: PartnerCertProgramState;
};

export function findDirectoryDetailDisplayTitle(partner: PartnerSearchResult): string {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

function agentTermsCategoryCount(state: PartnerCertProgramState): number | null {
  if (state.status === "loaded") return state.items.length;
  if (state.status === "empty") return 0;
  return null;
}

export function FindDirectoryDetailAgentTermsAccordion({
  partnerUserId,
  snapshot,
}: {
  partnerUserId: string;
  snapshot?: PartnerCertProgramState;
}) {
  const panelId = useId();
  const [state, setState] = useState<PartnerCertProgramState>(
    snapshot ?? { status: "loading" },
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (snapshot) {
      setState(snapshot);
      return;
    }
    let cancelled = false;
    const partnerAtRequest = partnerUserId;
    const epochAtRequest = getPartnerSearchInlineTermsViewerEpoch();
    setState({ status: "loading" });
    void readPartnerCertificateProgramForSearchCard(partnerAtRequest, {
      force: reloadKey > 0,
      viewerEpoch: epochAtRequest,
    }).then((next) => {
      if (cancelled || partnerAtRequest !== partnerUserId) return;
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [partnerUserId, reloadKey, snapshot]);

  const retry = () => {
    if (snapshot) return;
    resetPartnerSearchInlineTermsCache(partnerUserId);
    setReloadKey((key) => key + 1);
  };

  const count = agentTermsCategoryCount(state);

  return (
    <details
      className={styles.generalTermsFold}
      data-testid="partner-find-directory-detail-general-terms"
    >
      <summary className={styles.generalTermsSummary}>
        Общие условия для агентов
        {count !== null ? (
          <span className={styles.generalTermsBadge} data-testid="partner-find-directory-detail-general-terms-count">
            {count}
          </span>
        ) : null}
      </summary>
      <div className={styles.generalTermsBody} id={panelId}>
        {state.status === "loading" ? (
          <p className={styles.muted} data-testid="partner-find-directory-detail-general-terms-loading">
            Загрузка…
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className={styles.generalTermsError} role="alert">
            <span data-testid="partner-find-directory-detail-general-terms-error">{state.message}</span>{" "}
            {!snapshot ? (
              <button type="button" className={styles.generalTermsRetry} onClick={retry}>
                Повторить
              </button>
            ) : null}
          </p>
        ) : null}
        {state.status === "empty" ? (
          <p className={styles.generalTermsSmall} data-testid="partner-find-directory-detail-general-terms-empty">
            Общие условия пока не опубликованы. Можно запросить персональное предложение.
          </p>
        ) : null}
        {state.status === "loaded" ? (
          <>
            {state.items.map((item) => {
              const line = formatPartnerSearchInlineTermLine(item);
              return (
                <div className={styles.termSummary} key={item.category}>
                  <strong>{line.label}</strong>
                  <span>
                    Общий процент:{" "}
                    {line.percentText ? (
                      <b data-testid="partner-find-directory-detail-general-terms-percent">{line.percentText}</b>
                    ) : line.percentUnavailable ? (
                      <span className={styles.muted}>Нет данных</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
            {state.truncated ? (
              <p className={styles.muted}>
                Показаны первые категории; полный список у партнёра в кабинете.
              </p>
            ) : null}
          </>
        ) : null}
        <p
          className={styles.generalTermsDisclaimer}
          data-testid="partner-find-directory-detail-general-terms-disclaimer"
        >
          {PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER}
        </p>
      </div>
    </details>
  );
}

/** In-hub find directory detail body (frozen Ht-shaped); public search DTO + optional qt() terms. */
export function PartnerFindDirectoryDetailShell({
  partner,
  onBack,
  onInvite,
  inviteDisabled = false,
  showAgentTerms = false,
  agentTermsSnapshot,
}: PartnerFindDirectoryDetailShellProps) {
  const title = findDirectoryDetailDisplayTitle(partner);
  const typeLabel = searchResultTypeLabel(partner);
  const city = partner.city?.trim() || "";
  const { primary } = searchResultDirectionGroups(partner);
  const catalogLine = searchResultDetailCatalogLine(partner);
  const detailStagesLine = searchResultDetailStagesLine(partner);
  const description = partner.description?.trim() || "";
  const status = partner.partnershipStatus?.trim() || "";
  const statusLabel = status ? (PARTNERSHIP_STATUS_LABELS[status] ?? status) : "";
  const inviteFoot = searchResultInviteFoot(partner, { inviteDisabled });
  const inviteLabel = findDirectoryDetailInviteLabel(partner, { inviteDisabled });

  const topicsLine = primary.length > 0 ? primary.join(", ") : "";

  return (
    <section
      className={styles.shell}
      data-testid="partner-find-directory-detail-shell"
      data-partner-id={partner.id}
      aria-labelledby="partner-find-directory-detail-title"
    >
      <header className={styles.header}>
        <h2 id="partner-find-directory-detail-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.metaPill}>
          {typeLabel ? <span className={styles.type}>{typeLabel}</span> : null}
          {typeLabel && city ? <span aria-hidden="true"> · </span> : null}
          {city ? <span data-testid="partner-find-directory-detail-city">{city}</span> : (
            <span className={styles.muted} data-testid="partner-find-directory-detail-city-muted">
              Город не указан
            </span>
          )}
        </p>
      </header>

      <div className={styles.body}>
        {topicsLine ? (
          <p className={styles.lead} data-testid="partner-find-directory-detail-topics">
            {topicsLine}
          </p>
        ) : (
          <p className={styles.muted} data-testid="partner-find-directory-detail-topics-empty">
            Направления не указаны
          </p>
        )}

        <section
          className={styles.profileDirections}
          aria-labelledby="partner-find-directory-detail-directions-title"
          data-testid="partner-find-directory-detail-profile-directions"
        >
          <h3 id="partner-find-directory-detail-directions-title" className={styles.profileDirectionsTitle}>
            Специализация и этапы
          </h3>
          <p className={styles.profileDirectionsLine} data-testid="partner-find-directory-detail-catalog">
            {catalogLine || "Специализация не указана"}
          </p>
          <p className={styles.profileDirectionsLine} data-testid="partner-find-directory-detail-stages">
            Этапы: {detailStagesLine}
          </p>
        </section>

        {description ? (
          <p className={styles.description} data-testid="partner-find-directory-detail-description">
            {description}
          </p>
        ) : (
          <p className={styles.muted} data-testid="partner-find-directory-detail-description-empty">
            Описание в каталоге не указано
          </p>
        )}

        <p className={styles.notice}>
          Партнёр уже зарегистрирован в RemCard. Повторная регистрация для сотрудничества не нужна.
        </p>

        {showAgentTerms ? (
          <FindDirectoryDetailAgentTermsAccordion
            partnerUserId={partner.id}
            snapshot={agentTermsSnapshot}
          />
        ) : null}

        {status && status !== "ENDED" ? (
          <p className={styles.statusRow} data-testid="partner-find-directory-detail-status">
            <StatusBadge label={statusLabel} tone={partnershipStatusTone(status)} />
          </p>
        ) : null}

        {inviteFoot.blockedReason ? (
          <p className={styles.notice} data-testid="partner-find-directory-detail-invite-blocked">
            {inviteFoot.blockedReason}
          </p>
        ) : null}
      </div>

      <footer className={styles.foot}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          data-testid="partner-find-directory-detail-back"
        >
          Назад к поиску
        </button>
        <Button
          type="button"
          variant="primary"
          disabled={inviteFoot.disabled}
          onClick={onInvite}
          data-testid="partner-find-directory-detail-invite"
        >
          {inviteLabel}
        </Button>
      </footer>
    </section>
  );
}
