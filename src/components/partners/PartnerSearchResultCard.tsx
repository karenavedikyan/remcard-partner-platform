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

/** Canonical type caption already returned by search contract / meta mapping. */
export function searchResultTypeLabel(partner: PartnerSearchResult): string {
  const labeled = partner.partnerTypeLabel?.trim();
  if (labeled) return labeled;
  if (partner.partnerType === "STORE") return "Магазин";
  if (partner.partnerType === "COMPANY") return "Компания";
  if (partner.partnerType === "MASTER") return "Специалист";
  return "";
}

/** Real direction/stage labels available on the search DTO — no invented chips. */
export function searchResultDirectionLabels(partner: PartnerSearchResult): string[] {
  const fromApi = [
    ...(partner.workingProductLabels ?? []),
    ...(partner.workingServiceLabels ?? []),
    ...(partner.workingStageLabels ?? []),
  ]
    .map((label) => label.trim())
    .filter(Boolean);
  if (fromApi.length) return [...new Set(fromApi)].slice(0, 6);

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

  return [...new Set([...fromHint, ...stages])].slice(0, 6);
}

export function PartnerSearchResultCard({
  partner,
  title,
  showPublishedTerms,
  inviteDisabled,
  onInvite,
}: PartnerSearchResultCardProps) {
  const typeLabel = searchResultTypeLabel(partner);
  const city = partner.city?.trim() || "";
  const directions = searchResultDirectionLabels(partner);
  const status = partner.partnershipStatus?.trim() || "";
  const statusLabel = status
    ? (PARTNERSHIP_STATUS_LABELS[status] ?? status)
    : "";

  return (
    <article
      className={styles.modalResultCard}
      data-testid="agent-partner-search-result-card"
      data-partner-id={partner.id}
    >
      <div className={styles.modalResultHead}>
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

      <div className={styles.modalResultBody}>
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
        {directions.length > 0 ? (
          <ul
            className={styles.modalResultDirections}
            data-testid="agent-partner-search-result-directions"
            aria-label="Направления"
          >
            {directions.map((label) => (
              <li key={label} className={styles.modalResultDirection}>
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.modalResultDirectionsEmpty}>Направления не указаны</p>
        )}
        {showPublishedTerms ? (
          <div className={styles.modalResultTerms}>
            <PartnerGeneralTermsDetails partnerUserId={partner.id} />
          </div>
        ) : null}
      </div>

      <div className={styles.modalResultFoot}>
        <Button
          type="button"
          variant="secondary"
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
