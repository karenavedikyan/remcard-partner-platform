/**
 * P3 ↔ P4 client detail prop contract (K2 pin c49d71dc).
 * P3 fetches; P4 renders. Do not add receiving-private fields here.
 */

import type { ObserverAppealDetailPurchase, ObserverPublicTimelineEvent } from "@/lib/clients-parity/fetch-observer-appeal-detail";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import type { ObserverClientBackFrom } from "./observer-client-back";

export type ObserverPublicTimelineEntry = { at: string; text: string };

export type K2ObserverPublicPurchase = {
  amountKopecks: number;
  note?: string | null;
};

type Chrome = {
  onBack: () => void;
  backFrom?: ObserverClientBackFrom;
  backLabel?: string;
};

type LegacyReady = Chrome & {
  status?: undefined;
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  publicTimeline?: ObserverPublicTimelineEntry[];
  purchase?: K2ObserverPublicPurchase | null;
};

type PageReady = Chrome & {
  status: "ready";
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  publicTimeline: ObserverPublicTimelineEntry[];
  purchase: K2ObserverPublicPurchase | null;
};

export type ObserverClientDetailProps =
  | LegacyReady
  | PageReady
  | (Chrome & { status: "loading" })
  | (Chrome & { status: "missing"; clientId?: string })
  | (Chrome & { status: "error"; message: string; onRetry?: () => void });

export function mapPublicTimeline(rows: ObserverPublicTimelineEvent[]): ObserverPublicTimelineEntry[] {
  return rows.map((row) => ({ at: row.at, text: row.text }));
}

export function mapPublicPurchase(
  purchase: ObserverAppealDetailPurchase | null,
): K2ObserverPublicPurchase | null {
  if (!purchase) return null;
  return { amountKopecks: purchase.amountKopecks, note: purchase.note };
}
