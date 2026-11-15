import { CertificatePolicyChips } from "./CertificatePolicyChips";
import { CertificatePolicyCompactChips } from "./CertificatePolicyCompactChips";
import { CertificatePolicyStats } from "./CertificatePolicyStats";
import type { CertificateRecipientPolicySnapshot } from "@/lib/certificate-policy/types";
import type { IssuedRecipientPolicyView } from "@/lib/certificate-recipient-display";
import styles from "./certificate-policy.module.css";

export type CertificatePolicyRecipientTermsPolicy =
  | CertificateRecipientPolicySnapshot
  | IssuedRecipientPolicyView;

function isIssuedRecipientPolicyView(
  policy: CertificatePolicyRecipientTermsPolicy,
): policy is IssuedRecipientPolicyView {
  return "legacyFallback" in policy;
}

type Props = {
  policy: CertificatePolicyRecipientTermsPolicy;
  legacyIssued?: boolean;
  partnerUserId?: string;
  compact?: boolean;
  frozenValidUntil?: string | null;
  remainingPurchases?: number;
  consumedUses?: number;
};

export function CertificatePolicyRecipientTerms({
  policy,
  partnerUserId = "partner",
  compact = false,
  frozenValidUntil,
  remainingPurchases,
  consumedUses,
  legacyIssued,
}: Props) {
  const issued = isIssuedRecipientPolicyView(policy);
  const legacyPolicySource =
    issued && policy.policySource === "legacy";
  const showLegacy =
    legacyIssued ?? (issued ? policy.legacyFallback : false) ?? legacyPolicySource;

  if (compact) {
    return (
      <div
        className={styles.cpRecipient}
        data-testid={`cp-recipient-${partnerUserId}`}
      >
        {showLegacy ? (
          <div className={styles.cpChips} data-testid="cp-compact-legacy">
            <span className={styles.cpChip}>По сроку сертификата</span>
            <span className={styles.cpChip}>
              {policy.purchaseLimit == null ? "Без лимита" : `${policy.purchaseLimit} покупок`}
            </span>
          </div>
        ) : (
          <CertificatePolicyCompactChips
            summary={{
              validityDays: policy.validityDays ?? 0,
              purchaseLimit: policy.purchaseLimit ?? 0,
            }}
          />
        )}
      </div>
    );
  }

  const policySourceLabel = showLegacy
    ? "общие лимиты сертификата"
    : policy.policySource === "individual"
      ? "индивидуальные"
      : "общие";

  const remaining =
    remainingPurchases ??
    (issued ? policy.remainingPurchases : undefined) ??
    undefined;
  const consumed =
    consumedUses ?? (issued ? policy.consumedUses : undefined);

  return (
    <div
      className={styles.cpBlock}
      data-testid={`cp-recipient-detail-${partnerUserId}`}
    >
      <span className={styles.cpEyebrow}>
        Условия получателя · {policySourceLabel}
      </span>
      <CertificatePolicyStats
        terms={{
          validityDays: policy.validityDays,
          purchaseLimit: policy.purchaseLimit,
          promotionsCompatible: policy.promotionsCompatible,
        }}
        legacyIssued={showLegacy}
        frozenValidUntil={frozenValidUntil ?? ("validUntil" in policy ? policy.validUntil : null)}
        remainingPurchases={remaining ?? undefined}
        consumedUses={consumed}
      />
      {!showLegacy && policy.promotionsCompatible != null ? (
        <CertificatePolicyChips
          terms={{
            promotionsCompatible: policy.promotionsCompatible,
            minimumPurchaseAmount: policy.minimumPurchaseAmount,
            exclusionsText: policy.exclusionsText,
          }}
        />
      ) : null}
      {!showLegacy ? (
        <p className={styles.cpFine}>
          Срок и число покупок задаёт принимающий партнёр; изменить при выпуске нельзя.
        </p>
      ) : null}
    </div>
  );
}