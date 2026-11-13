import type { ObserverPartnerAppealStats, ObserverReferredAppeal } from "./types";

const SYSTEM = {
  NEW: "new",
  PAID: "paid",
  SHIPPED: "shipped",
  RETURN: "return",
  REFUSED: "refused",
} as const;

export function safePct(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return "0%";
  const pct = Math.round((numerator / denominator) * 100);
  return `${pct}%`;
}

export function observerAppealInWork(appeal: ObserverReferredAppeal): boolean {
  const id = appeal.stageId;
  return id !== SYSTEM.PAID && id !== SYSTEM.SHIPPED && id !== SYSTEM.REFUSED && id !== SYSTEM.RETURN;
}

export function appealReachedPaid(appeal: ObserverReferredAppeal): boolean {
  return appeal.stageId === SYSTEM.PAID || appeal.stageId === SYSTEM.SHIPPED;
}

export function appealReachedReturn(appeal: ObserverReferredAppeal): boolean {
  return appeal.stageId === SYSTEM.RETURN;
}

export function partnerAppealStats(list: ObserverReferredAppeal[]): ObserverPartnerAppealStats {
  const total = list.length;
  const inWork = list.filter((a) => observerAppealInWork(a)).length;
  const paidThrough = list.filter((a) => appealReachedPaid(a)).length;
  const refusals = list.filter((a) => a.stageId === SYSTEM.REFUSED).length;
  const returns = list.filter((a) => appealReachedReturn(a) || a.stageId === SYSTEM.RETURN).length;
  const lastUpdate = list.reduce((max, a) => (max > a.updatedAt ? max : a.updatedAt), "");
  return { total, inWork, paidThrough, refusals, returns, lastUpdate, conv: safePct(paidThrough, total) };
}

export function groupAppealsByPartner(
  appeals: ObserverReferredAppeal[],
): Map<string, ObserverReferredAppeal[]> {
  const byPartner = new Map<string, ObserverReferredAppeal[]>();
  for (const a of appeals) {
    const bucket = byPartner.get(a.receivingPartnerId) ?? [];
    bucket.push(a);
    byPartner.set(a.receivingPartnerId, bucket);
  }
  return byPartner;
}
