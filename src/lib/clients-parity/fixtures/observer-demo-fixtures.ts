/**
 * Synthetic observer dataset for isolated tests only — never import from production UI.
 */
import { CLIENTS_APPEAL_SYSTEM_STAGE } from "../types";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "../types";

export const OBSERVER_FIXTURE_PARTNERS: ObserverPartnerMeta[] = [
  {
    id: "partner-alpha",
    name: "Очень длинное название партнёра для проверки переноса строк в компактной карточке",
    city: "Москва",
    category: "Ремонт и отделка",
  },
  {
    id: "partner-beta",
    name: "Салон «Бета»",
    city: "Казань",
    category: "Мебель",
  },
];

export const OBSERVER_FIXTURE_APPEALS: ObserverReferredAppeal[] = [
  {
    id: "ref-1",
    clientName: "Анна К.",
    interest: "Кухня на заказ",
    receivingPartnerId: "partner-alpha",
    referrerPartnerId: "viewer",
    updatedAt: "2026-11-10T14:22:00Z",
    referralAt: "2026-11-01T10:00:00Z",
    certificateId: "CERT-1001",
    stageId: CLIENTS_APPEAL_SYSTEM_STAGE.NEW,
  },
  {
    id: "ref-2",
    clientName: "Игорь П.",
    interest: "Шкаф-купе",
    certificateId: "CERT-1002",
    receivingPartnerId: "partner-alpha",
    referrerPartnerId: "viewer",
    updatedAt: "2026-11-11T09:15:00Z",
    referralAt: "2026-10-15T10:00:00Z",
    stageId: CLIENTS_APPEAL_SYSTEM_STAGE.PAID,
  },
  {
    id: "ref-3",
    clientName: "Мария С.",
    interest: "Диван",
    receivingPartnerId: "partner-beta",
    referrerPartnerId: "viewer",
    updatedAt: "2026-11-12T18:40:00Z",
    referralAt: "2026-11-05T08:00:00Z",
    certificateId: "CERT-1003",
    stageId: CLIENTS_APPEAL_SYSTEM_STAGE.REFUSED,
  },
];
