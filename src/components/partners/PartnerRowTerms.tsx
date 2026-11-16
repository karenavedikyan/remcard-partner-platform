import { partnerTermsPreview } from "@/lib/agent-r04/partner-list-row";
import { displayCategoryLabel } from "@/lib/category-display";
import { formatPurchaseLimit, formatValidityDays } from "@/lib/partner-directions/direction";
import type { Partnership } from "@/lib/types";
import activeStyles from "./AgentActiveCollection.module.css";

export type RowRestrictions = { validityDays: number; purchaseLimit: number };

const RATE_ROWS_VISIBLE = 5;

function restrictionsLine(restrictions: RowRestrictions) {
  return `${formatValidityDays(restrictions.validityDays)} · ${formatPurchaseLimit(restrictions.purchaseLimit)}`;
}

function RateRow({ partnership, index }: { partnership: Partnership; index: number }) {
  const term = partnership.terms[index];
  const label = displayCategoryLabel(term.category, term.categoryLabel);
  return (
    <div data-testid="partner-row-category-rate" data-excluded={term.isExcluded ? "true" : undefined}>
      <dt>{label}</dt>
      <dd>
        {term.isExcluded ? (
          <span data-testid="partner-row-excluded-category">Не участвует</span>
        ) : (
          <>
            <strong>{term.storePercent}</strong>
            <span>%</span>
          </>
        )}
      </dd>
    </div>
  );
}

/**
 * Core offer (category rates) first; validity and purchase limit are secondary and optional.
 * `rates` is the outgoing collection layout from the frozen prototype (`dp-category-rates`);
 * `inline` is the compact legacy-row line used for incoming partners.
 */
export function PartnerRowTerms({
  partnership,
  restrictions,
  variant = "inline",
}: {
  partnership: Partnership;
  restrictions?: RowRestrictions | null;
  variant?: "inline" | "rates";
}) {
  const preview = partnerTermsPreview(partnership);
  const directional = Boolean(partnership.directionInfo);

  if (variant === "rates") {
    const total = partnership.terms.length;
    if (!total) return null;
    const indexes = Array.from({ length: total }, (_, index) => index);
    const visible = indexes.slice(0, RATE_ROWS_VISIBLE);
    const rest = indexes.slice(RATE_ROWS_VISIBLE);
    return (
      <div className={activeStyles.rateDetails} data-testid="partner-row-terms-block">
        <dl
          className={activeStyles.categoryRates}
          aria-label="Согласованные проценты по категориям"
          data-testid="partner-row-terms-preview"
        >
          {visible.map((index) => (
            <RateRow key={index} partnership={partnership} index={index} />
          ))}
        </dl>
        {rest.length ? (
          <details className={activeStyles.moreRates}>
            <summary>Ещё {rest.length}</summary>
            <dl className={activeStyles.categoryRates}>
              {rest.map((index) => (
                <RateRow key={index} partnership={partnership} index={index} />
              ))}
            </dl>
          </details>
        ) : null}
        {directional && restrictions ? (
          <p className={activeStyles.rateMeta} data-testid="partner-row-restrictions">
            {restrictionsLine(restrictions)}
          </p>
        ) : null}
      </div>
    );
  }

  if (!preview.rates) return null;
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
