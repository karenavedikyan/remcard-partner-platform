/**
 * P4 ↔ P3 observer client detail — K2 GET `/api/pro/referred-appeals/:id` (pin `c49d71dc`).
 * P3 fetches; P4 maps wire → view props. No receiving private fields.
 */

import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";

/** K2 `referrerPublicHistory` lines — `{ at, text }` only. */
export type ObserverPublicTimelineEntry = { at: string; text: string };

export const K2_REFERRED_APPEAL_DETAIL_ROUTE =
  "/api/pro/referred-appeals/:id" as const;

/** K2 response `purchase` — public referrer-safe projection only. */
export type K2ObserverPublicPurchase = {
  amountKopecks: number;
  note?: string | null;
};

export type K2ReferredAppealDetailWire = {
  appeal: ObserverReferredAppeal;
  receivingPartner: ObserverPartnerMeta | null;
  timeline: ObserverPublicTimelineEntry[];
  purchase: K2ObserverPublicPurchase | null;
};

export type ObserverClientDetailReadySlice = {
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  publicTimeline: ObserverPublicTimelineEntry[];
  purchase: K2ObserverPublicPurchase | null;
  refusedReason?: string | null;
};

export function formatObserverPublicPurchaseKopecks(amountKopecks: number): string {
  if (!Number.isFinite(amountKopecks) || amountKopecks < 0) return "—";
  const rub = amountKopecks / 100;
  return `${rub.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
}

/** P3 host: map authoritative K2 body to `status: "ready"` props (timeline may be []). */
export function k2ReferredAppealDetailToReadySlice(
  wire: K2ReferredAppealDetailWire,
): ObserverClientDetailReadySlice {
  return {
    appeal: wire.appeal,
    partner: wire.receivingPartner ?? undefined,
    publicTimeline: Array.isArray(wire.timeline) ? wire.timeline : [],
    purchase: wire.purchase ?? null,
  };
}
