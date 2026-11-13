import type { ObserverPersonalMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";

export const P5_APPEAL: ObserverReferredAppeal = {
  id: "p5-ref-1",
  clientName: "Тест Клиент",
  interest: "Декор",
  certificateId: "CERT-P5",
  receivingPartnerId: "partner-alpha",
  referrerPartnerId: "viewer",
  updatedAt: "2026-11-10T12:00:00Z",
  referralAt: "2026-11-01T08:00:00Z",
  stageId: "new",
};

export const P5_META: ObserverPersonalMeta = {
  alias: "Для меня",
  tag: "важно",
  note: "Перезвонить",
};
