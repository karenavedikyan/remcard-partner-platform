"use client";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PartnerSearchResultInlineTerms } from "@/components/partners/PartnerSearchResultInlineTerms";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { partnerSpecializationHint } from "@/lib/agent-r04/partner-list-row";
import type { PartnershipPartnerProfile } from "@/lib/agent-r04/partner-filters";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import { getLegalSiteUrl } from "@/lib/auth-config";
import type { PartnerSearchResult } from "@/lib/types";
import styles from "./PartnerSearchResultCard.module.css";

export type PartnerSearchResultCardProps = {
  partner: PartnerSearchResult;
  title: string;
  showPublishedTerms: boolean;
  inviteDisabled: boolean;
  inviteBusy?: boolean;
  onInvite: () => void;
  /** When set, «Подробнее» invokes this once (in-hub handoff); no navigation or new tab. */
  onDetail?: () => void;
  /** Parent P25t: card public summary state for find→detail snapshot handoff. */
  onPublicSummaryStateChange?: (partnerUserId: string, state: PartnerCertProgramState) => void;
};

export type SearchResultInviteFoot = {
  label: string;
  disabled: boolean;
  blockedReason: string | null;
};

/** Foot slot: status badge vs invite CTA (frozen pr-card-foot). */
export function searchResultFootPresentation(
  partner: PartnerSearchResult,
  opts: { inviteDisabled?: boolean; inviteBusy?: boolean } = {},
): {
  mode: "status-badge" | "invite-button";
  statusLabel: string | null;
  invite: SearchResultInviteFoot | null;
} {
  const status = partner.partnershipStatus?.trim() ?? "";
  if (status && status !== "ENDED") {
    return {
      mode: "status-badge",
      statusLabel: PARTNERSHIP_STATUS_LABELS[status] ?? status,
      invite: null,
    };
  }
  return {
    mode: "invite-button",
    statusLabel: null,
    invite: searchResultInviteFoot(partner, opts),
  };
}

/** Invite CTA from search DTO + hub busy/disabled flags (no network). */
export function searchResultInviteFoot(
  partner: PartnerSearchResult,
  opts: { inviteDisabled?: boolean; inviteBusy?: boolean } = {},
): SearchResultInviteFoot {
  const status = partner.partnershipStatus?.trim() ?? "";
  if (status && status !== "ENDED") {
    return {
      label: "Сотрудничать",
      disabled: true,
      blockedReason: PARTNERSHIP_STATUS_LABELS[status] ?? status,
    };
  }
  if (opts.inviteBusy) {
    return { label: "Отправка…", disabled: true, blockedReason: null };
  }
  if (opts.inviteDisabled) {
    return { label: "Сотрудничать", disabled: true, blockedReason: null };
  }
  return { label: "Сотрудничать", disabled: false, blockedReason: null };
}

export function searchResultShowOpenHint(partner: PartnerSearchResult): boolean {
  const status = partner.partnershipStatus?.trim() ?? "";
  return !status || status === "ENDED";
}

/** Canonical public catalog card on remcard.ru (navigator `/partner/[id]`), not in-hub find modal. */
export function searchResultPublicPartnerDetailUrl(partner: PartnerSearchResult): string | null {
  if (partner.isPublic === false) return null;
  const id = partner.id?.trim();
  if (!id) return null;
  return `${getLegalSiteUrl()}/partner/${encodeURIComponent(id)}`;
}

export type SearchResultDetailFootTarget =
  | { mode: "callback" }
  | { mode: "legacy-public-url"; href: string }
  | { mode: "none" };

/** Prefer parent `onDetail` (frozen in-hub detail); else optional legacy public URL fallback. */
export function searchResultDetailFootTarget(
  partner: PartnerSearchResult,
  opts: { onDetail?: () => void } = {},
): SearchResultDetailFootTarget {
  if (opts.onDetail) return { mode: "callback" };
  const href = searchResultPublicPartnerDetailUrl(partner);
  if (href) return { mode: "legacy-public-url", href };
  return { mode: "none" };
}

export function searchResultShowDetailControl(
  partner: PartnerSearchResult,
  opts: { onDetail?: () => void } = {},
): boolean {
  return searchResultDetailFootTarget(partner, opts).mode !== "none";
}

/** @deprecated Use searchResultShowDetailControl — legacy URL visibility only. */
export function searchResultShowPublicDetailLink(partner: PartnerSearchResult): boolean {
  return searchResultPublicPartnerDetailUrl(partner) !== null;
}

export type SearchResultCoverTone = "store" | "company" | "specialist" | "agent" | "neutral";

/** Canonical type caption already returned by search contract / meta mapping. */
export function searchResultTypeLabel(partner: PartnerSearchResult): string {
  const labeled = partner.partnerTypeLabel?.trim();
  if (labeled) return labeled;
  if (partner.partnerType === "STORE") return "Магазин";
  if (partner.partnerType === "COMPANY") return "Компания";
  if (partner.partnerType === "MASTER") return "Специалист";
  if (partner.partnerType === "AGENT") return "Агент";
  return "";
}

/** Cover tone from contract partnerType — presentation only. */
export function searchResultCoverTone(partner: PartnerSearchResult): SearchResultCoverTone {
  const raw = (partner.partnerType ?? partner.organizationPartnerType ?? "").toUpperCase();
  if (raw === "STORE") return "store";
  if (raw === "COMPANY") return "company";
  if (raw === "MASTER") return "specialist";
  if (raw === "AGENT") return "agent";
  const label = (partner.partnerTypeLabel ?? "").toLowerCase();
  if (label.includes("агент") || label.includes("agent")) return "agent";
  if (label.includes("магазин") || label.includes("store")) return "store";
  if (label.includes("компани") || label.includes("company")) return "company";
  if (label.includes("специалист") || label.includes("мастер") || label.includes("master")) {
    return "specialist";
  }
  return "neutral";
}

/** Initials monogram from the displayed name — no invented avatar URL. */
export function searchResultMonogram(title: string): string {
  const letters = title
    .replace(/[«»"']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toLocaleUpperCase("ru-RU"))
    .join("");
  return letters || "?";
}

function labelsFromApi(partner: PartnerSearchResult): {
  directions: string[];
  stages: string[];
} {
  const directions = [
    ...(partner.workingProductLabels ?? []),
    ...(partner.workingServiceLabels ?? []),
  ]
    .map((label) => label.trim())
    .filter(Boolean);
  const stages = (partner.workingStageLabels ?? [])
    .map((label) => label.trim())
    .filter(Boolean);
  return {
    directions: [...new Set(directions)],
    stages: [...new Set(stages)],
  };
}

/**
 * Real direction/stage labels from the search DTO.
 * Primary = products/services (or specialization hint); secondary = stages.
 */
export function searchResultDirectionGroups(partner: PartnerSearchResult): {
  primary: string[];
  stages: string[];
} {
  const fromApi = labelsFromApi(partner);
  if (fromApi.directions.length || fromApi.stages.length) {
    return {
      primary: fromApi.directions.slice(0, 4),
      stages: fromApi.stages.slice(0, 3),
    };
  }

  const asProfile = {
    id: partner.id,
    displayName: partner.displayName,
    partnerType: partner.partnerType ?? partner.organizationPartnerType ?? undefined,
    city: partner.city,
    storeCategories: partner.storeCategories,
    specializations: partner.specializations,
    workingProductCategoryIds: partner.productCategoryIds,
    workingServiceSpecializationIds: partner.serviceSpecializationIds,
    workingNavigatorStageIds: partner.navigatorStageIds,
  } as PartnershipPartnerProfile;

  const fromHint = partnerSpecializationHint(asProfile)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const stages = (partner.navigatorStageIds ?? [])
    .map((id) => masterDirectionLabel(id))
    .filter((label) => label !== "Категория");

  return {
    primary: [...new Set(fromHint)].slice(0, 4),
    stages: [...new Set(stages)].slice(0, 3),
  };
}

/** Flat list kept for tests / callers that need a single array. */
export function searchResultDirectionLabels(partner: PartnerSearchResult): string[] {
  const { primary, stages } = searchResultDirectionGroups(partner);
  return [...primary, ...stages].slice(0, 6);
}

export function PartnerSearchResultCard({
  partner,
  title,
  showPublishedTerms,
  inviteDisabled,
  inviteBusy = false,
  onInvite,
  onDetail,
  onPublicSummaryStateChange,
}: PartnerSearchResultCardProps) {
  const typeLabel = searchResultTypeLabel(partner);
  const coverTone = searchResultCoverTone(partner);
  const city = partner.city?.trim() || "";
  const { primary, stages } = searchResultDirectionGroups(partner);
  const monogram = searchResultMonogram(title);
  const status = partner.partnershipStatus?.trim() || "";
  const statusLabel = status
    ? (PARTNERSHIP_STATUS_LABELS[status] ?? status)
    : "";
  const inviteFoot = searchResultInviteFoot(partner, { inviteDisabled, inviteBusy });
  const showOpenHint = searchResultShowOpenHint(partner) && !inviteFoot.disabled;
  const showStatusInFoot = Boolean(status && status !== "ENDED");
  const showInviteControl = !showStatusInFoot;
  const detailFoot = searchResultDetailFootTarget(partner, { onDetail });
  const showDetailControl = showInviteControl && detailFoot.mode !== "none";

  const coverToneClass =
    coverTone === "store"
      ? styles.modalResultCoverStore
      : coverTone === "company"
        ? styles.modalResultCoverCompany
        : coverTone === "specialist"
          ? styles.modalResultCoverSpecialist
          : coverTone === "agent"
            ? styles.modalResultCoverAgent
            : styles.modalResultCoverNeutral;

  const logoToneClass =
    coverTone === "store"
      ? styles.modalResultLogoStore
      : coverTone === "company"
        ? styles.modalResultLogoCompany
        : coverTone === "specialist"
          ? styles.modalResultLogoSpecialist
          : coverTone === "agent"
            ? styles.modalResultLogoAgent
            : styles.modalResultLogoNeutral;

  return (
    <article
      className={styles.modalResultCard}
      data-testid="agent-partner-search-result-card"
      data-partner-id={partner.id}
      data-cover-tone={coverTone}
    >
      <div className={`${styles.modalResultCover} ${coverToneClass}`}>
        {typeLabel ? (
          <span className={styles.modalResultType} data-testid="agent-partner-search-result-type">
            {typeLabel}
          </span>
        ) : (
          <span className={styles.modalResultTypeMuted}>Тип не указан</span>
        )}
        {showOpenHint ? (
          <span className={styles.modalResultOpenHint} data-testid="agent-partner-search-result-open-hint">
            Открыт к партнёрству
          </span>
        ) : null}
      </div>

      <div className={styles.modalResultTop}>
        <span
          className={`${styles.modalResultLogo} ${logoToneClass}`}
          aria-hidden="true"
          data-testid="agent-partner-search-result-monogram"
        >
          {monogram}
        </span>
        <div className={styles.modalResultTitleBlock}>
          <h3 className={styles.modalResultName} data-testid="agent-partner-search-result-name">
            {title}
          </h3>
          {city ? (
            <p className={styles.modalResultCity} data-testid="agent-partner-search-result-city">
              {city}
            </p>
          ) : (
            <p className={styles.modalResultCityMuted} data-testid="agent-partner-search-result-city-muted">
              Город не указан
            </p>
          )}
        </div>
      </div>

      <div className={styles.modalResultBody} data-testid="agent-partner-search-result-body">
        {primary.length > 0 ? (
          <p
            className={styles.modalResultDirectionsPrimary}
            data-testid="agent-partner-search-result-directions"
          >
            {primary.join(" · ")}
          </p>
        ) : (
          <p
            className={styles.modalResultDirectionsEmpty}
            data-testid="agent-partner-search-result-directions"
          >
            Направления не указаны
          </p>
        )}
        {stages.length > 0 ? (
          <p className={styles.modalResultStages} data-testid="agent-partner-search-result-stages">
            {stages.join(" · ")}
          </p>
        ) : null}

        {showPublishedTerms ? (
          <div className={styles.modalResultTerms} data-testid="agent-partner-search-result-terms">
            <PartnerSearchResultInlineTerms
              key={partner.id}
              partnerUserId={partner.id}
              onPublicSummaryStateChange={onPublicSummaryStateChange}
            />
          </div>
        ) : null}
      </div>

      <div
        className={styles.modalResultFoot}
        data-testid="agent-partner-search-result-foot"
      >
        {showStatusInFoot ? (
          <span
            className={styles.modalResultFootStatus}
            data-testid="agent-partner-search-result-status"
          >
            <StatusBadge label={statusLabel} tone={partnershipStatusTone(status)} />
          </span>
        ) : (
          <>
            {showDetailControl ? (
              detailFoot.mode === "callback" ? (
                <button
                  type="button"
                  className={styles.modalResultFootDetailLink}
                  onClick={() => onDetail?.()}
                  data-testid="agent-partner-search-result-detail"
                >
                  Подробнее
                </button>
              ) : (
                <a
                  className={styles.modalResultFootDetailLink}
                  href={detailFoot.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="agent-partner-search-result-detail"
                  data-detail-mode="legacy-public-url"
                >
                  Подробнее
                </a>
              )
            ) : null}
            <div
              className={styles.modalResultFootActions}
              data-testid="agent-partner-search-result-foot-actions"
            >
              {inviteFoot.blockedReason ? (
                <p
                  className={styles.modalResultFootNote}
                  data-testid="agent-partner-search-result-invite-blocked"
                >
                  {inviteFoot.blockedReason}
                </p>
              ) : null}
              <Button
                type="button"
                variant="primary"
                disabled={inviteFoot.disabled}
                onClick={onInvite}
                data-testid="agent-partner-search-result-invite"
                aria-busy={inviteBusy || undefined}
              >
                {inviteFoot.label}
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
