import type { PartnerCertProgramItem, PartnerCertProgramState } from "@/lib/partner-certificate-program";
import { fetchPartnerCertificateProgram } from "@/lib/partner-certificate-program";

type InflightEntry = {
  serial: number;
  promise: Promise<PartnerCertProgramState>;
};

/** In-flight dedupe only — no settled/module-global snapshot cache (P25j). */
const inflightByPartner = new Map<string, InflightEntry>();
const serialByPartner = new Map<string, number>();
let viewerEpoch = 0;

export function getPartnerSearchInlineTermsViewerEpoch(): number {
  return viewerEpoch;
}

/** Clears in-flight dedupe (e.g. auth/session boundary — caller must invoke when viewer identity changes). */
export function bumpPartnerSearchInlineTermsViewerEpoch(): void {
  viewerEpoch += 1;
  inflightByPartner.clear();
  serialByPartner.clear();
}

export function resetPartnerSearchInlineTermsCache(partnerUserId?: string) {
  if (partnerUserId) {
    inflightByPartner.delete(partnerUserId);
    serialByPartner.delete(partnerUserId);
    return;
  }
  bumpPartnerSearchInlineTermsViewerEpoch();
}

/** One in-flight request per partner id; errors are never memoized; loaded data is not sticky across remounts. */
export async function readPartnerCertificateProgramForSearchCard(
  partnerUserId: string,
  opts: { force?: boolean; viewerEpoch?: number } = {},
): Promise<PartnerCertProgramState> {
  const epochAtStart = opts.viewerEpoch ?? viewerEpoch;

  if (!opts.force) {
    const pending = inflightByPartner.get(partnerUserId);
    if (pending) return pending.promise;
  } else {
    inflightByPartner.delete(partnerUserId);
  }

  const serial = (serialByPartner.get(partnerUserId) ?? 0) + 1;
  serialByPartner.set(partnerUserId, serial);

  const promise = fetchPartnerCertificateProgram(partnerUserId).then((state) => {
    if (viewerEpoch !== epochAtStart) return state;
    if (serialByPartner.get(partnerUserId) !== serial) return state;
    const inflight = inflightByPartner.get(partnerUserId);
    if (inflight?.serial === serial) {
      inflightByPartner.delete(partnerUserId);
    }
    return state;
  });

  inflightByPartner.set(partnerUserId, { serial, promise });
  return promise;
}

export function partnerSearchInlinePercentHeadline(items: PartnerCertProgramItem[]): string | null {
  const percents = items
    .map((item) => item.poolPercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!percents.length) return null;
  const min = Math.min(...percents);
  const max = Math.max(...percents);
  if (min === max) return `${min}%`;
  return `от ${min} до ${max}%`;
}

export function partnerSearchInlineTermsPreview(
  items: PartnerCertProgramItem[],
  maxItems = 3,
): PartnerCertProgramItem[] {
  return items.slice(0, maxItems);
}

export function partnerSearchInlineRemainingCount(
  items: PartnerCertProgramItem[],
  truncated: boolean | undefined,
  maxItems = 3,
): number {
  const rest = Math.max(0, items.length - maxItems);
  if (rest > 0) return rest;
  return truncated ? 1 : 0;
}

export function formatPartnerSearchInlineTermLine(item: PartnerCertProgramItem): {
  label: string;
  percentText: string | null;
  percentUnavailable: boolean;
} {
  const label = item.categoryLabel?.trim() || item.category?.trim() || "";
  if (typeof item.poolPercent === "number" && Number.isFinite(item.poolPercent)) {
    return { label, percentText: `${item.poolPercent}%`, percentUnavailable: false };
  }
  return { label, percentText: null, percentUnavailable: Boolean(label) };
}
