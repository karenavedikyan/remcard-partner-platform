import type { CertificatePartner, StoreCertificate } from "@/lib/certificate-types";
import type { CertificateRecipientPolicySnapshot } from "@/lib/certificate-policy/types";
import { certificatePolicyExpiryDateLabel } from "@/lib/certificate-policy/expiry";

export type IssuedRecipientPolicyView = Omit<
  CertificateRecipientPolicySnapshot,
  "validityDays" | "purchaseLimit" | "promotionsCompatible" | "policySource" | "validUntil"
> & {
  validityDays: number | null;
  purchaseLimit: number | null;
  promotionsCompatible: boolean | null;
  policySource: CertificateRecipientPolicySnapshot["policySource"] | "legacy";
  validUntil: string;
  consumedUses: number;
  remainingPurchases: number | null;
  legacyFallback: boolean;
};

function partnerSnapshot(partner: CertificatePartner): IssuedRecipientPolicyView | null {
  const snap = partner.recipientPolicy;
  if (!snap?.validUntil) return null;
  const limit = snap.purchaseLimit ?? 0;
  const consumed = snap.consumedUses ?? 0;
  const remaining =
    snap.remainingPurchases != null
      ? snap.remainingPurchases
      : Math.max(0, limit - consumed);
  return {
    validityDays: snap.validityDays,
    purchaseLimit: limit,
    minimumPurchaseAmount: snap.minimumPurchaseAmount,
    promotionsCompatible: snap.promotionsCompatible,
    exclusionsText: snap.exclusionsText,
    policySource: snap.policySource,
    validUntil: snap.validUntil,
    consumedUses: consumed,
    remainingPurchases: remaining,
    legacyFallback: false,
  };
}

/**
 * Legacy certificate without per-recipient snapshot — cert-level fields only.
 * Does not fabricate receiving-policy numbers or promotion rules.
 */
export function legacyRecipientPolicyFromCertificate(
  cert: StoreCertificate,
  partner: CertificatePartner,
): IssuedRecipientPolicyView | null {
  if (partner.recipientPolicy) return partnerSnapshot(partner);
  if (!cert.validUntil) return null;

  const finiteLimit = cert.maxUsages > 0 ? cert.maxUsages : null;
  const remaining =
    finiteLimit != null ? Math.max(0, finiteLimit - cert.usageCount) : null;

  return {
    validityDays: null,
    purchaseLimit: finiteLimit,
    minimumPurchaseAmount: null,
    promotionsCompatible: null,
    exclusionsText: null,
    policySource: "legacy",
    validUntil: cert.validUntil,
    consumedUses: cert.usageCount,
    remainingPurchases: remaining,
    legacyFallback: true,
  };
}

export function issuedRecipientPolicies(
  cert: StoreCertificate,
): Array<{ partner: CertificatePartner; policy: IssuedRecipientPolicyView }> {
  return (cert.partners ?? [])
    .map((partner) => {
      const policy = partnerSnapshot(partner) ?? legacyRecipientPolicyFromCertificate(cert, partner);
      return policy ? { partner, policy } : null;
    })
    .filter((row): row is { partner: CertificatePartner; policy: IssuedRecipientPolicyView } =>
      Boolean(row),
    );
}

export function formatFrozenRecipientExpiry(iso: string): string {
  return certificatePolicyExpiryDateLabel(iso);
}