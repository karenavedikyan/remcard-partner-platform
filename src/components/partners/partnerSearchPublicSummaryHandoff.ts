import type { PartnerCertProgramItem, PartnerCertProgramState } from "@/lib/partner-certificate-program";
import { formatPartnerSearchInlineTermLine } from "./partnerSearchResultInlineTerms";

/** Stable identity for handoff dedupe checks (partner id + summary kind + row fingerprint). */
export function publicSummarySnapshotIdentity(
  partnerUserId: string,
  state: PartnerCertProgramState,
): string {
  const kind = state.status;
  if (kind === "loaded") {
    const rows = state.items
      .map((item) => publicSummaryRowFingerprint(item))
      .sort()
      .join("|");
    return `${partnerUserId}:loaded:${rows}:trunc=${state.truncated ? 1 : 0}`;
  }
  if (kind === "error") {
    return `${partnerUserId}:error:${state.message}`;
  }
  return `${partnerUserId}:${kind}`;
}

function publicSummaryRowFingerprint(item: PartnerCertProgramItem): string {
  const line = formatPartnerSearchInlineTermLine(item);
  const pct =
    line.percentText ??
    (line.percentUnavailable ? "nodata" : "empty");
  return `${item.category}:${line.label}:${pct}`;
}

/** Parent flag contract: same gate as card `showPublishedTerms` → detail `showAgentTerms`. */
export function showAgentTermsForFindDetailHandoff(showAgentPublishedTerms: boolean): boolean {
  return showAgentPublishedTerms;
}

/**
 * When card already resolved public summary for this partner, pass snapshot to detail to skip duplicate upstream read.
 * Returns undefined while loading or when partner id does not match (fail-closed).
 */
export function agentTermsSnapshotForDetailHandoff(
  detailPartnerUserId: string,
  cardSummaryByPartnerId: ReadonlyMap<string, PartnerCertProgramState> | undefined,
): PartnerCertProgramState | undefined {
  if (!cardSummaryByPartnerId) return undefined;
  const snapshot = cardSummaryByPartnerId.get(detailPartnerUserId);
  if (!snapshot) return undefined;
  if (snapshot.status === "loading" || snapshot.status === "error") return undefined;
  return snapshot;
}

export type PublicSummaryComparableFields = {
  partnerUserId: string;
  status: PartnerCertProgramState["status"];
  headlinePercent: string | null;
  firstRowLabel: string | null;
  firstRowPercentText: string | null;
  firstRowPercentUnavailable: boolean;
};

export function publicSummaryComparableFields(
  partnerUserId: string,
  state: PartnerCertProgramState,
): PublicSummaryComparableFields {
  if (state.status !== "loaded") {
    return {
      partnerUserId,
      status: state.status,
      headlinePercent: null,
      firstRowLabel: null,
      firstRowPercentText: null,
      firstRowPercentUnavailable: false,
    };
  }
  const first = state.items[0];
  const line = first ? formatPartnerSearchInlineTermLine(first) : null;
  const percents = state.items
    .map((i) => i.poolPercent)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  let headlinePercent: string | null = null;
  if (percents.length) {
    const min = Math.min(...percents);
    const max = Math.max(...percents);
    headlinePercent = min === max ? `${min}%` : `от ${min} до ${max}%`;
  }
  return {
    partnerUserId,
    status: state.status,
    headlinePercent,
    firstRowLabel: line?.label ?? null,
    firstRowPercentText: line?.percentText ?? null,
    firstRowPercentUnavailable: line?.percentUnavailable ?? false,
  };
}

/** Card row and detail shell must expose the same published summary fields for the same partner entity. */
export function publicSummaryFieldsMatchCardAndDetail(
  card: PublicSummaryComparableFields,
  detail: PublicSummaryComparableFields,
): boolean {
  if (card.partnerUserId !== detail.partnerUserId) return false;
  if (card.status !== detail.status) return false;
  if (card.status !== "loaded") return true;
  return (
    card.headlinePercent === detail.headlinePercent &&
    card.firstRowLabel === detail.firstRowLabel &&
    card.firstRowPercentText === detail.firstRowPercentText &&
    card.firstRowPercentUnavailable === detail.firstRowPercentUnavailable
  );
}

/** Reject handoff when a stale async completion targets a partner no longer selected (A under B). */
export function shouldApplyPublicSummaryHandoffUpdate(
  selectedPartnerUserId: string,
  updatePartnerUserId: string,
  lifecycleGeneration: number,
  updateGeneration: number,
): boolean {
  if (lifecycleGeneration !== updateGeneration) return false;
  return selectedPartnerUserId === updatePartnerUserId;
}
