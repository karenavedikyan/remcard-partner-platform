import { partnerTermsPreview } from "@/lib/agent-r04/partner-list-row";
import { formatPurchaseLimit, formatValidityDays } from "@/lib/partner-directions/direction";
import type { Partnership } from "@/lib/types";
import activeStyles from "./AgentActiveCollection.module.css";

export type RowRestrictions = { validityDays: number; purchaseLimit: number };

/** Core offer (category rates) first; validity and purchase limit are secondary and optional. */
export function PartnerRowTerms({
  partnership,
  restrictions,
}: {
  partnership: Partnership;
  restrictions?: RowRestrictions | null;
}) {
  const preview = partnerTermsPreview(partnership);
  if (!preview.rates) return null;
  const directional = Boolean(partnership.directionInfo);
  return (
    <div className={activeStyles.termsBlock} data-testid="partner-row-terms-block">
      <p className={activeStyles.termsTitle}>Условия</p>
      <p className={activeStyles.termsRates} data-testid="partner-row-terms-preview">
        {preview.rates}
        {preview.moreCount > 0 ? ` · ещё ${preview.moreCount}` : ""}
      </p>
      {directional && restrictions ? (
        <p className={activeStyles.termsPreview} data-testid="partner-row-restrictions">
          Срок скидки: {formatValidityDays(restrictions.validityDays)} · {formatPurchaseLimit(restrictions.purchaseLimit)}
        </p>
      ) : null}
      {directional && preview.excluded ? (
        <p className={activeStyles.termsPreview} data-testid="partner-row-excluded">
          Не участвуют: {preview.excluded}
        </p>
      ) : null}
    </div>
  );
}
