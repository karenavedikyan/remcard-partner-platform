import { displayCategoryLabel } from "@/lib/category-display";
import type { CertificatePolicyCounterparty } from "@/lib/certificate-policy/types";
import { CertificatePolicyChips } from "./CertificatePolicyChips";
import { CertificatePolicyStats } from "./CertificatePolicyStats";
import styles from "./certificate-policy.module.css";

type Props = {
  rows: CertificatePolicyCounterparty[];
};

/**
 * Terms of agreements where the viewer ISSUES certificates. The receiving partner authors them,
 * so they are shown read-only and never offer an editor.
 */
export function CertificatePolicyIssuingTerms({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <section className={styles.cpBlock} data-testid="cp-issuing-terms" aria-label="Условия партнёров для ваших рекомендаций">
      <span className={styles.cpEyebrow}>Условия партнёров для ваших рекомендаций</span>
      <p className={styles.cpFine}>
        Эти условия задаёт принимающий партнёр. Вы выдаёте ему сертификаты по ним и не можете их менять.
      </p>
      {rows.map((row) => (
        <div
          key={row.partnershipId ?? row.userId}
          className={styles.cpBlock}
          data-testid={`cp-issuing-${row.partnershipId ?? row.userId}`}
        >
          <strong>{row.displayName}</strong>
          <ul className={styles.cpFine} aria-label={`Категории: ${row.displayName}`}>
            {row.effective.categoryRates.map((rate) => (
              <li key={rate.category}>
                {displayCategoryLabel(rate.category, rate.categoryLabel)}: {rate.poolPercent}%
                {rate.poolPercent === 0 ? " — без скидки по этой категории" : ""}
              </li>
            ))}
          </ul>
          <CertificatePolicyStats terms={row.effective} />
          <CertificatePolicyChips terms={row.effective} />
        </div>
      ))}
    </section>
  );
}
