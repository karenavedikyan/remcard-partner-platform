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
  receivingPartnerId: string;
  referrerPartnerId: string;
  updatedAt: string;
  referralAt?: string | null;
  stageId: ObserverAppealStageId;
};

export type ObserverPartnerMeta = {
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
