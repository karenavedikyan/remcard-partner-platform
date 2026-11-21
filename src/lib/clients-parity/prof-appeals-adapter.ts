/**
 * PROF p149 — mirror of navigator `receivingAppealsWireContract.ts`
 * @see karenavedikyan/remcard-navigator @ cursor/remcard-149-f208 (96b6431)
 */

import type {
  ReceivingAppealListRow,
  ReceivingAppealListRowWire,
  ReceivingListFilters,
  ReceivingRowCapabilities,
} from "./receiving-appeals-api";

export const REMCARD_CLIENT_LOGIN_URL = "https://remcard.ru/?login=client" as const;

export type ReceivingAppealRemCardListWire = {
  inCabinet: boolean;
  registeredAt: string | null;
};

export type ReceivingAppealRemCardDetailWire = ReceivingAppealRemCardListWire & {
  publicId?: string;
  inviteLoginUrl?: typeof REMCARD_CLIENT_LOGIN_URL;
};

export type ReceivingAppealExternalRefWire = {
  key: string;
  label: string;
  value: string;
};

export type ReceivingAppealResponsibleWire = {
  userId: string;
  displayLabel: string;
};

export type ReceivingAppealCapabilitiesWire = ReceivingRowCapabilities & {
  canSelectForBulkWrite: boolean;
  canPrepareCommercialProposal: boolean;
  canSendCommercialProposal: boolean;
};

export type ReceivingAppealListItemWire = {
  id: string;
  appealTitle: string | null;
  clientDisplayName: string;
  requestText: string | null;
  stageKey: string;
  stageLabel: string | null;
  certificatePromoCode: string | null;
  erpDocumentNumber: string | null;
  externalRefs: ReceivingAppealExternalRefWire[];
  manualSourceKey: string | null;
  manualSourceLabel: string | null;
  responsible: ReceivingAppealResponsibleWire | null;
  receivingBranchId: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  createdAt: string;
  updatedAt: string;
  remCard: ReceivingAppealRemCardListWire;
  capabilities: ReceivingAppealCapabilitiesWire;
};

export type CommercialProposalInvestigatedDestination = {
  path: string;
  suitable: boolean;
  reason: string;
};

export type CommercialProposalDeliveryWire = {
  prepareAllowed: boolean;
  previewAllowed: boolean;
  sendEnabled: boolean;
  sendDisabledReason: string | null;
  investigatedDestinations: CommercialProposalInvestigatedDestination[];
};

export type ReceivingAppealDetailWire = ReceivingAppealListItemWire & {
  remCard: ReceivingAppealRemCardDetailWire;
  clientCity: string | null;
  clientContact: string | null;
  budgetHint: string | null;
  privateNotes: string | null;
  discountPercent: number | null;
  certValidUntil: string | null;
  purchaseOrderId: string | null;
  paidAmountKopecks: number | null;
  paidAt: string | null;
  referrerDisplayName: string | null;
  commercialProposal: CommercialProposalDeliveryWire;
};

export type ReceivingAppealsListFilterCountsWire = {
  remCardMatchCount: number;
};

export type ReceivingAppealsListResponseWire = {
  appeals: ReceivingAppealListItemWire[];
  filterCounts: ReceivingAppealsListFilterCountsWire;
  nextCursor: string | null;
  bucket: string;
  tab: "incoming";
};

/** UI row — list + legacy bulk/stage helpers. */
export type ProfAppealListRow = ReceivingAppealListRow & {
  appealTitle: string | null;
  clientDisplayName: string;
  requestText: string | null;
  certificatePromoCode: string | null;
  erpDocumentNumber: string | null;
  externalRefs: ReceivingAppealExternalRefWire[];
  manualSourceLabel: string | null;
  responsible: ReceivingAppealResponsibleWire | null;
  originKind: "CERTIFICATE" | "MANUAL";
  remCard: ReceivingAppealRemCardListWire;
  profCapabilities: ReceivingAppealCapabilitiesWire;
};

export type ProfListFilters = ReceivingListFilters & {
  remCardOnly?: boolean;
  requestFilter?: string;
  appealSourceKey?: string;
};

export type ProfAppealProfilePatchBody = {
  expectedRevision: string | number;
  appealTitle?: string | null;
  clientDisplayName?: string;
  interest?: string | null;
  clientCity?: string | null;
  clientContact?: string | null;
  budgetHint?: string | null;
  privateNotes?: string | null;
  manualSourceKey?: string | null;
  responsibleUserId?: string | null;
  erpDocumentNumber?: string | null;
  externalRefs?: ReceivingAppealExternalRefWire[] | null;
};

export function isProfAppealListItemWire(raw: unknown): raw is ReceivingAppealListItemWire {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.remCard != null &&
    typeof r.remCard === "object" &&
    typeof (r.remCard as ReceivingAppealRemCardListWire).inCabinet === "boolean"
  );
}

export function profListQueryParams(filters: Partial<ProfListFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.remCardOnly) params.set("remCardOnly", "1");
  return params;
}

export function parseProfFilterCounts(wire: unknown): number | null {
  if (!wire || typeof wire !== "object") return null;
  const fc = (wire as { filterCounts?: unknown }).filterCounts;
  if (!fc || typeof fc !== "object") return null;
  const n = (fc as ReceivingAppealsListFilterCountsWire).remCardMatchCount;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function defaultProfCapabilities(
  base?: ReceivingRowCapabilities | null,
): ReceivingAppealCapabilitiesWire {
  return {
    canManageLeads: base?.canManageLeads ?? false,
    canScan: base?.canScan ?? false,
    canSelectForBulkWrite: base?.canManageLeads ?? false,
    canPrepareCommercialProposal: false,
    canSendCommercialProposal: false,
  };
}

/** Map authoritative p149 list wire → UI row (also fills legacy ReceivingAppealListRow fields). */
export function mapProfAppealListItemWire(wire: ReceivingAppealListItemWire): ProfAppealListRow {
  const manualEntry = wire.originKind === "MANUAL";
  const interest = wire.requestText?.trim() || "—";
  const legacy: ReceivingAppealListRow = {
    id: wire.id,
    clientName: wire.clientDisplayName.trim() || "—",
    certificateId: "",
    receivingPartnerUserId: "",
    receivingPartnerId: "",
    referrerPartnerId: "",
    interest,
    stageId: wire.stageKey,
    stageLabel: wire.stageLabel ?? undefined,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    manualEntry,
    manualSourceKey: wire.manualSourceKey,
    receivingBranchId: wire.receivingBranchId,
    capabilities: {
      canManageLeads: wire.capabilities.canManageLeads,
      canScan: wire.capabilities.canScan,
    },
  };
  return {
    ...legacy,
    appealTitle: wire.appealTitle,
    clientDisplayName: wire.clientDisplayName,
    requestText: wire.requestText,
    certificatePromoCode: wire.certificatePromoCode,
    erpDocumentNumber: wire.erpDocumentNumber,
    externalRefs: Array.isArray(wire.externalRefs) ? wire.externalRefs : [],
    manualSourceLabel: wire.manualSourceLabel,
    responsible: wire.responsible,
    originKind: wire.originKind,
    remCard: wire.remCard,
    profCapabilities: wire.capabilities,
  };
}

/** Legacy K1 row before p149 deploy — best-effort prof projection without heuristics on cabinet. */
export function mapLegacyReceivingRowToProf(base: ReceivingAppealListRow, wire?: ReceivingAppealListRowWire): ProfAppealListRow {
  const w = wire as (ReceivingAppealListRowWire & Partial<ReceivingAppealListItemWire>) | undefined;
  if (w && isProfAppealListItemWire(w)) return mapProfAppealListItemWire(w);
  const promo = w?.certificatePromoCode?.trim() || null;
  const cap = defaultProfCapabilities(base.capabilities);
  return {
    ...base,
    appealTitle: w?.appealTitle ?? null,
    clientDisplayName: base.clientName,
    requestText: base.interest === "—" ? null : base.interest,
    certificatePromoCode: promo,
    erpDocumentNumber: (w as { erpDocumentNumber?: string | null })?.erpDocumentNumber ?? null,
    externalRefs: [],
    manualSourceLabel: null,
    responsible: null,
    originKind: base.manualEntry ? "MANUAL" : "CERTIFICATE",
    remCard: { inCabinet: false, registeredAt: null },
    profCapabilities: cap,
  };
}

export function coerceProfAppealsFromListWire(
  appealsWire: unknown[],
  mapLegacy: (w: ReceivingAppealListRowWire) => ReceivingAppealListRow,
): ProfAppealListRow[] {
  return appealsWire.map((raw) => {
    if (isProfAppealListItemWire(raw)) return mapProfAppealListItemWire(raw);
    return mapLegacyReceivingRowToProf(mapLegacy(raw as ReceivingAppealListRowWire), raw as ReceivingAppealListRowWire);
  });
}

export function profAppealRowSubtitle(row: ProfAppealListRow, branchLabel?: string | null): string {
  const parts: string[] = [];
  const client = row.clientDisplayName?.trim() || row.clientName?.trim();
  if (client && client !== "—") parts.push(client);
  const tail = row.id.replace(/^appeal-/, "").slice(-4);
  if (tail) parts.push(`№ ${tail}`);
  if (branchLabel?.trim()) parts.push(branchLabel.trim());
  return parts.join(" · ") || "—";
}

export function profRowSourceLabel(row: ProfAppealListRow): string {
  if (row.manualSourceLabel?.trim()) return row.manualSourceLabel.trim();
  if (row.originKind === "CERTIFICATE") return "По сертификату";
  return "—";
}

export function profAppealSearchHaystack(row: ProfAppealListRow): string {
  return [
    row.appealTitle,
    row.clientDisplayName,
    row.requestText,
    row.certificatePromoCode,
    row.erpDocumentNumber,
    row.responsible?.displayLabel,
    ...row.externalRefs.map((f) => `${f.label} ${f.value}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterProfAppealsClient(
  appeals: ProfAppealListRow[],
  filters: Partial<ProfListFilters>,
): ProfAppealListRow[] {
  let list = [...appeals];
  const q = filters.q?.trim().toLowerCase();
  if (q) list = list.filter((r) => profAppealSearchHaystack(r).includes(q));
  if (filters.appealSourceKey && filters.appealSourceKey !== "all") {
    list = list.filter((r) => r.manualSourceKey === filters.appealSourceKey);
  }
  if (filters.remCardOnly) list = list.filter((r) => r.remCard.inCabinet);
  if (filters.requestFilter && filters.requestFilter !== "Все") {
    list = list.filter((r) => (r.requestText?.trim() || "—") === filters.requestFilter);
  }
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function profRowCanBulkSelect(row: ProfAppealListRow): boolean {
  return row.profCapabilities.canSelectForBulkWrite && row.profCapabilities.canManageLeads;
}

export function profStageStatusClass(stageId: string): string {
  if (stageId === "sys_new") return "appeal-status is-new";
  if (stageId === "sys_refused" || stageId === "sys_return") return "appeal-status";
  return "appeal-status is-progress";
}

export function commercialProposalBlockedMessage(wire?: CommercialProposalDeliveryWire | null): string {
  if (!wire) {
    return "Отправка отключена: сервер не вернул состояние доставки КП.";
  }
  if (wire.sendEnabled) return "";
  return wire.sendDisabledReason?.trim() || "Отправка КП отключена.";
}