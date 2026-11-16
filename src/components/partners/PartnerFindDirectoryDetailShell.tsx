"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PartnerDirectionBadge } from "@/components/partners/PartnerDirectionBadge";
import { searchDirectionBadge } from "@/lib/partner-directions/direction";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { CertificatePolicyPublicDetails } from "@/components/certificate-policy/CertificatePolicyPublicDetails";
import { certificatePolicyPublicSummaryFromProgram } from "@/lib/certificate-policy/public-summary";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import type { PartnerSearchResult } from "@/lib/types";
import {
  findDirectoryDetailInviteLabel,
  searchResultDetailCatalogLine,
  searchResultDetailStagesLine,
  searchResultInviteFoot,
  searchResultReciprocal,
  type PartnerSearchResultCardProps,
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
  inviteBusy?: boolean;
  /** Frozen qt() block — AGENT-only published pool %; default false (no fetch/render). */
  showAgentTerms?: boolean;
  /** Public certificate receiving-policy (STORE/COMPANY/MASTER owners); not agent financial rows. */
  showPublicCertificatePolicy?: boolean;
  /** Optional parent snapshot (same certificate-program-summary contract as search card). */
  agentTermsSnapshot?: PartnerCertProgramState;
  /** Same per-direction context the search result card uses; omitted when the audience has no direction tabs. */
  directionContext?: PartnerSearchResultCardProps["directionContext"];
};

export function findDirectoryDetailDisplayTitle(partner: PartnerSearchResult): string {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

function agentTermsCategoryCount(state: PartnerCertProgramState): number | null {
  if (state.status === "loaded") return state.items.length;
  if (state.status === "empty") return 0;
  return null;
}

export function FindDirectoryDetailPublicCertificatePolicy({
  partnerUserId,
  snapshot,
}: {
  partnerUserId: string;
  snapshot?: PartnerCertProgramState;
}) {
  const [state, setState] = useState<PartnerCertProgramState>(snapshot ?? { status: "loading" });
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

  return (
    <section
      className={styles.generalTermsFold}
      data-testid="partner-find-directory-public-certificate-policy"
    >
      <h3 className={styles.profileDirectionsTitle}>Условия приёма сертификата</h3>
      {state.status === "loading" ? (
        <p className={styles.muted} data-testid="partner-find-directory-public-certificate-policy-loading">
          Загрузка…
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className={styles.generalTermsError} role="alert">
          <span data-testid="partner-find-directory-public-certificate-policy-error">{state.message}</span>{" "}
          {!snapshot ? (
            <button type="button" className={styles.generalTermsRetry} onClick={retry}>
              Повторить
            </button>
          ) : null}
        </p>
      ) : null}
      {state.status === "empty" ? (
        <p className={styles.muted} data-testid="partner-find-directory-public-certificate-policy-empty">
          Партнёр ещё не опубликовал условия приёма сертификата.
        </p>
      ) : null}
      {state.status === "loaded" ? (
        state.policy ? (
          <CertificatePolicyPublicDetails
            policy={{
              ...certificatePolicyPublicSummaryFromProgram(state.policy),
              items: state.items,
            }}
            items={state.items}
            truncated={state.truncated}
            testId="partner-find-directory-public-certificate-policy-details"
          />
        ) : (
          <p className={styles.muted} data-testid="partner-find-directory-public-certificate-policy-no-policy">
            Срок и лимит покупок не опубликованы.
          </p>
        )
      ) : null}
    </section>
  );
}

export function FindDirectoryDetailAgentTermsAccordion({
  partnerUserId,
  snapshot,
  title = "Общие условия для агентов",
}: {
  partnerUserId: string;
  snapshot?: PartnerCertProgramState;
  title?: string;
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
        {title}
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
            {state.policy ? (
              <CertificatePolicyPublicDetails
                policy={{
                  ...certificatePolicyPublicSummaryFromProgram(state.policy),
                  items: state.items,
                }}
                items={state.items}
                truncated={state.truncated}
                testId="partner-find-directory-general-policy"
              />
            ) : null}
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
  inviteBusy = false,
  showAgentTerms = false,
  showPublicCertificatePolicy = false,
  agentTermsSnapshot,
  directionContext,
}: PartnerFindDirectoryDetailShellProps) {
  const title = findDirectoryDetailDisplayTitle(partner);
  const typeLabel = searchResultTypeLabel(partner);
  const city = partner.city?.trim() || "";
  const catalogLine = searchResultDetailCatalogLine(partner);
  const detailStagesLine = searchResultDetailStagesLine(partner);
  const description = partner.description?.trim() || "";
  const status = partner.partnershipStatus?.trim() || "";
  const statusLabel = status ? (PARTNERSHIP_STATUS_LABELS[status] ?? status) : "";
  const inviteFoot = searchResultInviteFoot(partner, { inviteDisabled, inviteBusy });
  const inviteLabel = findDirectoryDetailInviteLabel(partner, { inviteDisabled, inviteBusy });

  const directionBadge = directionContext ? searchDirectionBadge(partner, directionContext.audience) : null;
  const reciprocal = directionContext
    ? searchResultReciprocal(partner, directionContext.viewerSide, directionContext.audience)
    : null;
  const hasProfileDirections = Boolean(catalogLine) || detailStagesLine !== "не указаны";

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
        {showPublicCertificatePolicy ? (
          <FindDirectoryDetailPublicCertificatePolicy
            partnerUserId={partner.id}
            snapshot={agentTermsSnapshot}
          />
        ) : null}
        {showAgentTerms ? (
          <FindDirectoryDetailAgentTermsAccordion
            partnerUserId={partner.id}
            snapshot={agentTermsSnapshot}
          />
        ) : null}

        {description ? (
          <p className={styles.description} data-testid="partner-find-directory-detail-description">
            {description}
          </p>
        ) : null}

        {hasProfileDirections ? (
          <details
            className={styles.generalTermsFold}
            data-testid="partner-find-directory-detail-profile-directions"
          >
            <summary className={styles.generalTermsSummary}>Специализация и этапы</summary>
            <div className={styles.profileDirections}>
              {catalogLine ? (
                <p className={styles.profileDirectionsLine} data-testid="partner-find-directory-detail-catalog">
                  {catalogLine}
                </p>
              ) : null}
              <p className={styles.profileDirectionsLine} data-testid="partner-find-directory-detail-stages">
                Этапы: {detailStagesLine}
              </p>
            </div>
          </details>
        ) : null}

        <p className={styles.notice} data-testid="partner-find-directory-detail-registered-note">
          Партнёр уже зарегистрирован в RemCard. Повторная регистрация для сотрудничества не нужна.
        </p>

        {status && status !== "ENDED" ? (
          <p className={styles.statusRow} data-testid="partner-find-directory-detail-status">
            <StatusBadge label={statusLabel} tone={partnershipStatusTone(status)} />
            {directionBadge ? (
              <PartnerDirectionBadge
                glyph={directionBadge.glyph}
                label={directionBadge.label}
                description={directionBadge.description}
                pending={directionBadge.pending}
                testId="partner-find-directory-detail-direction"
              />
            ) : null}
          </p>
        ) : null}

        {inviteFoot.blockedReason && inviteFoot.blockedReason !== statusLabel ? (
          <p className={styles.notice} data-testid="partner-find-directory-detail-invite-blocked">
            {inviteFoot.blockedReason}
          </p>
        ) : null}
      </div>

      <footer className={styles.foot}>
        {reciprocal && directionContext ? (
          <Button
            type="button"
            variant="primary"
            className={styles.footInvite}
            disabled={inviteDisabled}
            onClick={() => directionContext.onReciprocalInvite(reciprocal.direction)}
            data-testid="partner-find-directory-detail-reciprocal"
          >
            {reciprocal.label}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            className={styles.footInvite}
            disabled={inviteFoot.disabled}
            onClick={onInvite}
            data-testid="partner-find-directory-detail-invite"
            aria-busy={inviteBusy || undefined}
          >
            {inviteLabel}
          </Button>
        )}
        <button
          type="button"
          className={`${styles.backButton} ${styles.footBack}`}
          onClick={onBack}
          data-testid="partner-find-directory-detail-back"
        >
          Назад к поиску
        </button>
      </footer>
    </section>
  );
}
