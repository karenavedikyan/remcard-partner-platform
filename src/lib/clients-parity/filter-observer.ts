import type {
  ObserverPersonalBucket,
  ObserverPersonalMeta,
  ObserverPartnerMeta,
  ObserverReferredAppeal,
} from "./types";
import { observerReceivingPartnerKey } from "./types";

export type ObserverFilterState = {
  q: string;
  period: "all" | "30" | "90" | "365";
  bucket: ObserverPersonalBucket;
};

export function observerPeriodCutoff(period: ObserverFilterState["period"]): Date | null {
  if (period === "all") return null;
  const days = period === "30" ? 30 : period === "90" ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function referralDateIso(appeal: ObserverReferredAppeal): string {
  return appeal.referralAt || appeal.updatedAt;
}

function personalBucket(
  meta: ObserverPersonalMeta | undefined,
  fallback: ObserverPersonalBucket = "active",
): ObserverPersonalBucket {
  return meta?.bucket ?? fallback;
}

export function filterObserverAppeals(
  state: ObserverFilterState,
  list: ObserverReferredAppeal[],
  partnersById: Map<string, ObserverPartnerMeta>,
  personalMeta: Record<string, ObserverPersonalMeta>,
): ObserverReferredAppeal[] {
  const q = state.q.trim().toLowerCase();
  const cutoff = observerPeriodCutoff(state.period);
  let out = list.filter((a) => personalBucket(personalMeta[a.id]) === state.bucket);
  if (cutoff) {
    out = out.filter((a) => new Date(referralDateIso(a)) >= cutoff);
  }
  if (!q) return out;
  return out.filter((a) => {
    const partner = partnersById.get(observerReceivingPartnerKey(a));
    const meta = personalMeta[a.id];
    const hay = [
      a.clientName,
      a.interest,
      a.certificateId,
      a.id,
      meta?.alias,
      meta?.tag,
      meta?.note,
      partner?.name,
      partner?.city,
      partner?.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
