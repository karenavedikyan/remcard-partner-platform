"use client";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PartnerGeneralTermsDetails } from "@/components/partners/PartnerGeneralTermsDetails";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { partnerSpecializationHint } from "@/lib/agent-r04/partner-list-row";
import type { PartnershipPartnerProfile } from "@/lib/agent-r04/partner-filters";
import type { PartnerSearchResult } from "@/lib/types";
import styles from "./PartnerSearchResultCard.module.css";

export type PartnerSearchResultCardProps = {
  partner: PartnerSearchResult;
  title: string;
  showPublishedTerms: boolean;
  inviteDisabled: boolean;
  onInvite: () => void;
};

export type SearchResultCoverTone = "store" | "company" | "specialist" | "neutral";

/** Canonical type caption already returned by search contract / meta mapping. */
export function searchResultTypeLabel(partner: PartnerSearchResult): string {
  const labeled = partner.partnerTypeLabel?.trim();
  if (labeled) return labeled;
  if (partner.partnerType === "STORE") return "Магазин";
  if (partner.partnerType === "COMPANY") return "Компания";
  if (partner.partnerType === "MASTER") return "Специалист";
  return "";
}

/** Cover tone from contract partnerType — presentation only. */
export function searchResultCoverTone(partner: PartnerSearchResult): SearchResultCoverTone {
  const raw = (partner.partnerType ?? partner.organizationPartnerType ?? "").toUpperCase();
  if (raw === "STORE") return "store";
  if (raw === "COMPANY") return "company";
  if (raw === "MASTER") return "specialist";
  const label = (partner.partnerTypeLabel ?? "").toLowerCase();
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
  onInvite,
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

  const coverToneClass =
    coverTone === "store"
      ? styles.modalResultCoverStore
      : coverTone === "company"
        ? styles.modalResultCoverCompany
        : coverTone === "specialist"
          ? styles.modalResultCoverSpecialist
          : styles.modalResultCoverNeutral;

  const logoToneClass =
    coverTone === "store"
      ? styles.modalResultLogoStore
      : coverTone === "company"
        ? styles.modalResultLogoCompany
        : coverTone === "specialist"
          ? styles.modalResultLogoSpecialist
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
        {status ? (
          <StatusBadge label={statusLabel} tone={partnershipStatusTone(status)} />
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
            <p className={styles.modalResultCityMuted}>Город не указан</p>
          )}
        </div>
      </div>

      <div className={styles.modalResultBody}>
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
            <PartnerGeneralTermsDetails partnerUserId={partner.id} />
          </div>
        ) : null}
      </div>

      <div className={styles.modalResultFoot}>
        <Button
          type="button"
          variant="primary"
          disabled={inviteDisabled}
          onClick={onInvite}
          data-testid="agent-partner-search-result-invite"
        >
          Пригласить
        </Button>
      </div>
    </article>
  );
}
