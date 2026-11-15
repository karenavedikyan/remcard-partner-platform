import type { StoreCertificate } from "@/lib/certificate-types";
import {
  buildStoreCertificateClientCardModel,
  deriveStoreCertCardState,
  type StoreCertificateClientCardModel,
  type StoreCertCardState,
} from "@/lib/storeCertificateClientCardModel";
import {
  issuedRecipientPolicies,
  type IssuedRecipientPolicyView,
} from "@/lib/certificate-recipient-display";
import { certificatePolicyExpiryDateLabel } from "@/lib/certificate-policy/expiry";
import {
  certificatePolicyChipLabels,
  certificatePolicyDaysWord,
  certificatePolicyPurchaseChip,
} from "@/lib/certificate-policy/format";

export type IssuedRecipientRowState =
  | "active"
  | "expired"
  | "depleted"
  | "cancelled"
  | "unavailable";

export type IssuedCertificatePreviewRow = {
  partnerUserId: string;
  partnerName: string;
  policy: IssuedRecipientPolicyView;
  rowState: IssuedRecipientRowState;
};

export type IssuedCertificatePreview =
  | { kind: "legacy"; model: StoreCertificateClientCardModel }
  | {
      kind: "policy-dark";
      model: StoreCertificateClientCardModel;
      rows: IssuedCertificatePreviewRow[];
    };

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Frozen snapshot only — never cert.validUntil / maxUsages for policy rows. */
export function recipientPolicyRowState(
  policy: IssuedRecipientPolicyView,
): IssuedRecipientRowState {
  const rawUntil = policy.validUntil?.trim();
  const until = parseIso(policy.validUntil);
  if (rawUntil && !until) return "expired";
  if (until && until.getTime() < Date.now()) return "expired";
  if (policy.remainingPurchases != null && policy.remainingPurchases <= 0) return "depleted";
  if (
    policy.purchaseLimit != null &&
    policy.purchaseLimit > 0 &&
    policy.consumedUses >= policy.purchaseLimit
  ) {
    return "depleted";
  }
  return "active";
}

export function certificateHasRecipientPolicySnapshots(cert: StoreCertificate): boolean {
  return (cert.partners ?? []).some((p) => {
    const rp = p.recipientPolicy;
    if (!rp) return false;
    if (rp.policySource === "general" || rp.policySource === "individual") return true;
    return Boolean(rp.validUntil?.trim());
  });
}

const KNOWN_WHOLE_CERT_STATUSES = new Set([
  "ACTIVE",
  "USED_PARTIALLY",
  "EXPIRED",
  "USED_FULLY",
  "CANCELLED",
]);

function normalizeCertStatus(cert: StoreCertificate): string {
  return String(cert.status ?? "").trim().toUpperCase();
}

/** Whole-certificate status overrides per-recipient row badges when authoritative. */
function certificateAuthorityRowState(
  cert: StoreCertificate,
): IssuedRecipientRowState | null {
  const status = normalizeCertStatus(cert);
  if (status === "CANCELLED") return "cancelled";
  if (!status || !KNOWN_WHOLE_CERT_STATUSES.has(status)) return "unavailable";
  return null;
}

function aggregatePolicyCardState(
  cert: StoreCertificate,
  rowStates: IssuedRecipientRowState[],
): StoreCertCardState {
  const status = normalizeCertStatus(cert);
  if (status === "CANCELLED") return "cancelled";
  if (!status || !KNOWN_WHOLE_CERT_STATUSES.has(status)) return "unavailable";
  if (rowStates.some((s) => s === "active")) return "active";
  if (rowStates.length > 0 && rowStates.every((s) => s === "expired")) return "expired";
  if (rowStates.length > 0 && rowStates.every((s) => s === "depleted")) return "used";
  if (status === "EXPIRED") return "expired";
  if (status === "USED_FULLY") return "used";
  return "unavailable";
}

function policyTermSummary(rows: IssuedCertificatePreviewRow[]): string {
  const active = rows.filter((r) => r.rowState === "active");
  if (active.length === 0) {
    const first = rows[0];
    return first ? `до ${certificatePolicyExpiryDateLabel(first.policy.validUntil)}` : "—";
  }
  if (active.length === 1) {
    return `до ${certificatePolicyExpiryDateLabel(active[0]!.policy.validUntil)}`;
  }
  return "Срок и покупки — по партнёрам";
}

function policyStatusSummary(rows: IssuedCertificatePreviewRow[]): string {
  const active = rows.filter((r) => r.rowState === "active").length;
  const n = rows.length;
  if (n === 0) return "—";
  if (active === n) return `${active} ${active === 1 ? "партнёр активен" : "партнёра активны"}`;
  if (active === 0) return "Нет активных партнёров";
  return `${active} из ${n} активны`;
}

function policyStatusSummaryForCard(
  cardState: StoreCertCardState,
  rows: IssuedCertificatePreviewRow[],
): string {
  if (cardState === "cancelled") return "Сертификат отозван";
  if (cardState === "unavailable") return "Недоступен";
  return policyStatusSummary(rows);
}

export function formatIssuedPolicyRowFact(policy: IssuedRecipientPolicyView): string {
  const until = certificatePolicyExpiryDateLabel(policy.validUntil);
  const purchases =
    policy.purchaseLimit == null
      ? "без лимита"
      : certificatePolicyPurchaseChip(policy.purchaseLimit);
  const days =
    policy.validityDays != null && policy.validityDays > 0
      ? `${policy.validityDays} ${certificatePolicyDaysWord(policy.validityDays)}`
      : null;
  return [days, purchases, until ? `до ${until}` : null].filter(Boolean).join(" · ");
}

/** Frozen min purchase, promotions, and exclusions for issued dark-card rows. */
export function formatIssuedPolicyRowRestrictions(
  policy: IssuedRecipientPolicyView,
): string {
  if (policy.legacyFallback || policy.policySource === "legacy") return "";
  const parts = certificatePolicyChipLabels({
    promotionsCompatible: policy.promotionsCompatible ?? false,
    minimumPurchaseAmount: policy.minimumPurchaseAmount,
  });
  const exclusions = policy.exclusionsText?.trim();
  if (exclusions) parts.push(exclusions);
  return parts.join(" · ");
}

export function buildIssuedCertificatePreview(
  cert: StoreCertificate,
  visibleCode: string,
  certificateUrl: string,
): IssuedCertificatePreview {
  const legacyModel = buildStoreCertificateClientCardModel(cert, visibleCode, certificateUrl);

  if (!certificateHasRecipientPolicySnapshots(cert)) {
    return { kind: "legacy", model: legacyModel };
  }

  const authority = certificateAuthorityRowState(cert);
  const rows: IssuedCertificatePreviewRow[] = issuedRecipientPolicies(cert).map(
    ({ partner, policy }) => {
      const snapshotState = recipientPolicyRowState(policy);
      return {
        partnerUserId: partner.storeUserId,
        partnerName: partner.storeName,
        policy,
        rowState: authority ?? snapshotState,
      };
    },
  );

  const snapshotRowStates = rows.map((r) =>
    authority ? recipientPolicyRowState(r.policy) : r.rowState,
  );
  const state = aggregatePolicyCardState(cert, snapshotRowStates);

  const model: StoreCertificateClientCardModel = {
    ...legacyModel,
    active: state === "active",
    state,
    termTextValue: policyTermSummary(rows),
    statusLabelText: policyStatusSummaryForCard(state, rows),
    stampText:
      state === "active"
        ? null
        : state === "expired"
          ? "Истёк"
          : state === "used"
            ? "Использован"
            : legacyModel.stampText,
  };

  return { kind: "policy-dark", model, rows };
}