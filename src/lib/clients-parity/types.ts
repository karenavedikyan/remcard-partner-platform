/** View-model for «Мои клиенты у партнёров» (prototype ownReferredAppeals shape). */

export type ObserverAppealStageId =
  | "new"
  | "paid"
  | "shipped"
  | "return"
  | "refused"
  | string;

export type ObserverReferredAppeal = {
  id: string;
  clientName: string;
  interest?: string | null;
  certificateId?: string | null;
  /** Receiving owner User.id (prototype PARTNERS key — not Branch.id). */
  receivingPartnerUserId?: string;
  receivingPartnerId: string;
  referrerPartnerId: string;
  updatedAt: string;
  referralAt?: string | null;
  stageId: ObserverAppealStageId;
};

export type ObserverPartnerMeta = {
  /** Partner User principal id for display/stats grouping (not Branch.id). */
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
};

export type ObserverPartnerAppealStats = {
  total: number;
  inWork: number;
  paidThrough: number;
  refusals: number;
  returns: number;
  lastUpdate: string;
  conv: string;
};

export type ObserverPersonalBucket = "active" | "archived" | "trash";

export type ObserverPersonalMeta = {
  alias?: string;
  tag?: string;
  note?: string;
  bucket?: ObserverPersonalBucket;
};

export type ClientsParityDirection = "incoming" | "at-partners";

export function observerReceivingPartnerKey(
  appeal: Pick<ObserverReferredAppeal, "receivingPartnerUserId" | "receivingPartnerId">,
): string {
  return (appeal.receivingPartnerUserId ?? appeal.receivingPartnerId).trim();
}

export type ObserverAppealsLoadResult =
  | {
      ok: true;
      appeals: ObserverReferredAppeal[];
      partners: ObserverPartnerMeta[];
    }
  | {
      ok: false;
      code: "BLOCKED_CONTRACT";
      blockerId: string;
      message: string;
      missingRoutes: string[];
    };
