import { CertificatePolicyChips } from "./CertificatePolicyChips";
import { CertificatePolicyCompactChips } from "./CertificatePolicyCompactChips";
import type { CertificatePolicyPublicSummary } from "@/lib/certificate-policy/types";
import type { PartnerCertProgramItem } from "@/lib/partner-certificate-program";
import styles from "./certificate-policy.module.css";

type Props = {
  policy: CertificatePolicyPublicSummary;
  items: PartnerCertProgramItem[];
  truncated?: boolean;
  /** Catalog card: chips only; directory details: full stats. */
  compact?: boolean;
  testId?: string;
};

export function CertificatePolicyPublicDetails({
  policy,
  items,
  truncated,
  compact = false,
  testId,
}: Props) {
  if (compact) {
    return <CertificatePolicyCompactChips summary={policy} testId={testId} />;
  }

  return (
    <div className={styles.cpBlock} data-testid={testId ?? "cp-public-details"}>
      <CertificatePolicyCompactChips summary={policy} />
      <CertificatePolicyChips terms={policy} />
      {items.length > 0 ? (
        <ul className={styles.cpFine} data-testid="cp-public-pools">
          {items.map((item) => (
            <li key={item.category}>
              {item.categoryLabel}: общий процент {item.poolPercent}%
              {item.poolPercent === 0 ? " (участие без вознаграждения)" : null}
            </li>
          ))}
        </ul>
      ) : null}
      {truncated ? (
        <p className={styles.cpFine}>Показаны первые категории; полный список у партнёра в кабинете.</p>
      ) : null}
    </div>
  );
}