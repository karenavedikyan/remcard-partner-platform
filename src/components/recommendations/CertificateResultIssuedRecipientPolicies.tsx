"use client";

import { CertificatePolicyRecipientTerms } from "@/components/certificate-policy/CertificatePolicyRecipientTerms";
import { issuedRecipientPolicies } from "@/lib/certificate-recipient-display";
import type { StoreCertificate } from "@/lib/certificate-types";
import styles from "./recommendations.module.css";
import cpStyles from "@/components/certificate-policy/certificate-policy.module.css";

type Props = {
  certificate: StoreCertificate;
};

export function CertificateResultIssuedRecipientPolicies({ certificate }: Props) {
  const rows = issuedRecipientPolicies(certificate);
  if (rows.length === 0) return null;

  return (
    <section
      className={`${cpStyles.cpRecipient} ${styles.specialistCertRecipientPolicies}`}
      data-testid="certificate-issued-recipient-policies"
      aria-label="Условия по партнёрам"
    >
      <h3 className={cpStyles.cpPanelTitle}>Условия приёма по партнёрам</h3>
      <ul className={styles.specialistCertRecipientList}>
        {rows.map(({ partner, policy }) => (
          <li key={partner.id} data-testid={`issued-policy-${partner.storeUserId}`}>
            <div className={styles.specialistCertRecipientHeader}>
              <strong>{partner.storeName}</strong>
              {policy.legacyFallback ? (
                <span className={styles.specialistCertLegacyTag}>Общие лимиты сертификата</span>
              ) : (
                <span className={styles.specialistCertFrozenTag}>
                  {policy.policySource === "individual" ? "Индивидуально" : "Общие"}
                </span>
              )}
            </div>
            <CertificatePolicyRecipientTerms
              policy={policy}
              legacyIssued={policy.legacyFallback}
              frozenValidUntil={policy.validUntil}
              remainingPurchases={policy.remainingPurchases ?? undefined}
              consumedUses={policy.consumedUses}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}