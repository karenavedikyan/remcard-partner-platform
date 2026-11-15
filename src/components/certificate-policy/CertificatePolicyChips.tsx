import { certificatePolicyChipLabels } from "@/lib/certificate-policy/format";
import type { CertificatePolicyTerms } from "@/lib/certificate-policy/types";
import styles from "./certificate-policy.module.css";

type Props = {
  terms: Pick<
    CertificatePolicyTerms,
    "promotionsCompatible" | "minimumPurchaseAmount" | "exclusionsText"
  >;
};

export function CertificatePolicyChips({ terms }: Props) {
  const chips = certificatePolicyChipLabels(terms);
  return (
    <>
      <div className={styles.cpChips} data-testid="cp-chips">
        {chips.map((label) => (
          <span key={label} className={styles.cpChip}>
            {label}
          </span>
        ))}
      </div>
      {terms.exclusionsText ? (
        <p className={styles.cpFine}>{terms.exclusionsText}</p>
      ) : null}
    </>
  );
}