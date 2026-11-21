/**
 * Synthetic PROF page 149 — local tests only.
 */
import type { ProfAppealListRow, ReceivingAppealListItemWire } from "./prof-appeals-adapter";
import { mapProfAppealListItemWire } from "./prof-appeals-adapter";
import type { ReceivingAppealsListResponse } from "./receiving-appeals-api";

const AT = "2026-11-10T10:00:00.000Z";

function wireItem(over: Partial<ReceivingAppealListItemWire>): ReceivingAppealListItemWire {
  return {
    id: "appeal-2408",
    appealTitle: "Отделка прихожей",
    clientDisplayName: "Анна П.",
    requestText: "Межкомнатные двери, 4 шт.",
    stageKey: "ws_work",
    stageLabel: "В работе",
    certificatePromoCode: null,
    erpDocumentNumber: null,
    externalRefs: [],
    manualSourceKey: "phone",
    manualSourceLabel: "Звонок",
    responsible: { userId: "u-maria", displayLabel: "Мария" },
    receivingBranchId: "branch-north",
    originKind: "MANUAL",
    createdAt: AT,
    updatedAt: AT,
    remCard: { inCabinet: true, registeredAt: AT },
    capabilities: {
      canManageLeads: true,
      canScan: true,
      canSelectForBulkWrite: true,
      canPrepareCommercialProposal: true,
      canSendCommercialProposal: false,
    },
    ...over,
  };
}

export const PROF_DEMO_APPEAL_2408: ProfAppealListRow = mapProfAppealListItemWire(wireItem({}));

export const PROF_DEMO_APPEAL_2401: ProfAppealListRow = mapProfAppealListItemWire(
  wireItem({
    id: "appeal-2401",
    appealTitle: "Кухня на заказ",
    clientDisplayName: "Игорь К.",
    manualSourceKey: "partner_referral",
    manualSourceLabel: "Направил партнёр",
    stageKey: "sys_new",
    stageLabel: "Новое",
    remCard: { inCabinet: false, registeredAt: null },
  }),
);

export const PROF_DEMO_APPEALS: ProfAppealListRow[] = [
  PROF_DEMO_APPEAL_2408,
  PROF_DEMO_APPEAL_2401,
  ...Array.from({ length: 16 }, (_, i) =>
    mapProfAppealListItemWire(
      wireItem({
        id: `appeal-demo-${i}`,
        appealTitle: `Обращение ${i + 3}`,
        clientDisplayName: `Демо ${i + 1}`,
        requestText: i % 2 ? "Плитка" : "Сантехника",
        remCard: { inCabinet: false, registeredAt: null },
      }),
    ),
  ),
];

export type ProfReceivingAppealsListResponse = ReceivingAppealsListResponse & {
  profAppeals: ProfAppealListRow[];
  remCardMatchCount: number;
};

export function profDemoListResponse(over: Partial<ReceivingAppealsListResponse> = {}): ProfReceivingAppealsListResponse {
  return {
    appeals: PROF_DEMO_APPEALS,
    profAppeals: PROF_DEMO_APPEALS,
    remCardMatchCount: 1,
    readOnly: false,
    kpis: { total: 18, inWork: 12, paid: 2, shipped: 0, conv: "11%" },
    settings: {
      workingStages: [
        { id: "ws_work", label: "В работе" },
        { id: "ws_measure", label: "Замер" },
      ],
      refusalReasons: [],
      archivedStages: [],
      manualChannels: [
        { key: "phone", label: "Звонок" },
        { key: "custom_vystavka_1", label: "Выставка" },
      ],
    },
    access: { listAllowed: true, mutationsAllowed: true, canManageLeads: true, canScan: true, actorKind: "owner" },
    ...over,
  };
}