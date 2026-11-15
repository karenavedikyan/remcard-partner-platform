import {
  certificatePolicyDaysWord,
  certificatePolicyPurchaseMode,
} from "@/lib/certificate-policy/format";
import {
  certificatePolicyExpiryDateLabel,
  certificatePolicyExpiryIso,
} from "@/lib/certificate-policy/expiry";
import styles from "./certificate-policy.module.css";

type Props = {
  terms: {
    validityDays: number | null;
    purchaseLimit: number | null;
    promotionsCompatible?: boolean | null;
  };
  legacyIssued?: boolean;
  /**
   * Issued snapshot: frozen server `validUntil` — never recompute from "today".
   */
  frozenValidUntil?: string | null;
  remainingPurchases?: number;
  consumedUses?: number;
  /**
   * Settings editor: optional Москва-calendar preview from validityDays.
   */
  showExpiryPreview?: boolean;
  previewIssuedAt?: Date;
};

export function CertificatePolicyStats({
  terms,
  frozenValidUntil = null,
  remainingPurchases,
  consumedUses,
  showExpiryPreview = false,
  previewIssuedAt,
  legacyIssued = false,
}: Props) {
  const frozenLabel =
    frozenValidUntil != null && String(frozenValidUntil).trim()
      ? certificatePolicyExpiryDateLabel(frozenValidUntil)
      : null;

  const previewUntil =
    !frozenLabel &&
    showExpiryPreview &&
    terms.validityDays != null &&
    terms.validityDays > 0
      ? certificatePolicyExpiryDateLabel(
          certificatePolicyExpiryIso(terms.validityDays, previewIssuedAt ?? new Date()),
        )
      : null;

  return (
    <div className={styles.cpStats} data-testid="cp-stats">
      <div className={styles.cpStat}>
        <span className={styles.cpEyebrow}>Срок скидки</span>
        <strong>
          {legacyIssued && terms.validityDays == null ? (
            <span data-testid="cp-stats-legacy-expiry">По сроку сертификата</span>
          ) : terms.validityDays != null ? (
            <>
              {terms.validityDays}{" "}
              <small>{certificatePolicyDaysWord(terms.validityDays)}</small>
            </>
          ) : (
            <span data-testid="cp-stats-legacy-expiry">По сроку сертификата</span>
          )}
        </strong>
        {frozenLabel ? (
          <span className={styles.cpFine} data-testid="cp-stats-until-frozen">
            до {frozenLabel}
          </span>
        ) : previewUntil ? (
          <span className={styles.cpFine} data-testid="cp-stats-until-preview">
            предпросмотр: до {previewUntil}
          </span>
        ) : null}
      </div>
      <div className={styles.cpStat}>
        <span className={styles.cpEyebrow}>Покупок</span>
        <strong>
          {legacyIssued && terms.purchaseLimit == null ? (
            <span data-testid="cp-stats-legacy-unlimited">Без лимита</span>
          ) : terms.purchaseLimit != null ? (
            <>
              {terms.purchaseLimit}{" "}
              <small>{certificatePolicyPurchaseMode(terms.purchaseLimit)}</small>
            </>
          ) : (
            <span data-testid="cp-stats-legacy-unlimited">Без лимита</span>
          )}
        </strong>
        {remainingPurchases != null ? (
          <span className={styles.cpFine} data-testid="cp-stats-remaining">
            осталось {remainingPurchases}
            {consumedUses != null ? ` · использовано ${consumedUses}` : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}