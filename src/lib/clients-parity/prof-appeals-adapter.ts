/**
 * PROF p149 — mirror of navigator `receivingAppealsWireContract.ts`
 * @see karenavedikyan/remcard-navigator @ 5b93ee1
 */

import type {
  ReceivingAppealDetailWire as ReceivingAppealDetailEnvelopeWire,
  ReceivingAppealHistoryEntry,
  ReceivingAppealHistoryWire,
  ReceivingAppealListRow,
  ReceivingListFilters,
  ReceivingRowCapabilities,
  ReceivingWorkingStage,
} from "./receiving-appeals-api";
import { parseReceivingRowCapabilities, receivingDetailWireReadOnly } from "./receiving-appeals-api";

export const REMCARD_CLIENT_LOGIN_URL = "https://remcard.ru/?login=client" as const;

/** List row — only `inCabinet` (no registration timestamp). */
export type ReceivingAppealRemCardListWire = {
  inCabinet: boolean;
};

/** Detail card — never treat `certificateTermsAcceptedAt` as RemCard registration. */
export type ReceivingAppealRemCardDetailWire = ReceivingAppealRemCardListWire & {
  publicId?: string;
  inviteLoginUrl?: typeof REMCARD_CLIENT_LOGIN_URL;
  certificateTermsAcceptedAt?: string;
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

/** Legacy per-row wire — exactly `{ canManageLeads, canScan }`. */
export type ReceivingAppealLegacyCapabilitiesWire = ReceivingRowCapabilities;

export type ReceivingAppealP149CapabilitiesWire = {
  canSelectForBulkWrite: boolean;
  canPrepareCommercialProposal: boolean;
  canSendCommercialProposal: boolean;
};

/** Merged view for UI (legacy + additive p149). */
export type ProfAppealCapabilitiesWire = ReceivingRowCapabilities & ReceivingAppealP149CapabilitiesWire;

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
  capabilities: ReceivingAppealLegacyCapabilitiesWire;
  p149Capabilities: ReceivingAppealP149CapabilitiesWire;
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

export type ReceivingAppealProfDetailRowWire = ReceivingAppealListItemWire & {
  remCard: ReceivingAppealRemCardDetailWire;
  clientCity: string | null;
  clientContact: string | null;
  budgetHint: string | null;
  privateNotes: string | null;
  commercialProposal: CommercialProposalDeliveryWire;
};

export type ReceivingAppealsListFilterCountsWire = {
  remCardMatchCount: number;
};

export type ProfListFilters = ReceivingListFilters & {
  remCardOnly?: boolean;
  /** Client-only until backend list query accepts requestText. */
  requestFilter?: string;
  /** Client-only until backend list query accepts manualSourceKey. */
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
  profCapabilities: ProfAppealCapabilitiesWire;
};

/**
 * Authoritative p149 list signal: `filterCounts.remCardMatchCount` on GET (even 0 on an empty page).
 * Do not infer from row shape or synthesized projections.
 */
export function isP149ListContractWire(wire: unknown): boolean {
  if (!wire || typeof wire !== "object") return false;
  const fc = (wire as { filterCounts?: unknown }).filterCounts;
  if (!fc || typeof fc !== "object") return false;
  const n = (fc as ReceivingAppealsListFilterCountsWire).remCardMatchCount;
  return typeof n === "number" && Number.isFinite(n);
}

function parseP149Capabilities(raw: unknown): ReceivingAppealP149CapabilitiesWire | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.canSelectForBulkWrite !== "boolean") return null;
  if (typeof r.canPrepareCommercialProposal !== "boolean") return null;
  if (typeof r.canSendCommercialProposal !== "boolean") return null;
  return {
    canSelectForBulkWrite: r.canSelectForBulkWrite,
    canPrepareCommercialProposal: r.canPrepareCommercialProposal,
    canSendCommercialProposal: r.canSendCommercialProposal,
  };
}

export function mergeProfCapabilities(
  legacy?: ReceivingRowCapabilities | null,
  p149?: ReceivingAppealP149CapabilitiesWire | null,
): ProfAppealCapabilitiesWire {
  const base = legacy ?? { canManageLeads: false, canScan: false };
  return {
    canManageLeads: base.canManageLeads,
    canScan: base.canScan,
    canSelectForBulkWrite: p149?.canSelectForBulkWrite ?? base.canManageLeads,
    canPrepareCommercialProposal: p149?.canPrepareCommercialProposal ?? false,
    canSendCommercialProposal: p149?.canSendCommercialProposal ?? false,
  };
}

export function isProfAppealListItemWire(raw: unknown): raw is ReceivingAppealListItemWire {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  const rem = r.remCard;
  if (!rem || typeof rem !== "object") return false;
  if (typeof (rem as ReceivingAppealRemCardListWire).inCabinet !== "boolean") return false;
  return parseP149Capabilities(r.p149Capabilities) != null;
}

export function profListQueryParams(filters: Partial<ProfListFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.remCardOnly) params.set("remCardOnly", "1");
  return params;
}

export function parseProfFilterCounts(wire: unknown): number | null {
  if (!isP149ListContractWire(wire)) return null;
  const fc = (wire as { filterCounts: ReceivingAppealsListFilterCountsWire }).filterCounts;
  return fc.remCardMatchCount;
}

const DEFAULT_COMMERCIAL_PROPOSAL: CommercialProposalDeliveryWire = {
  prepareAllowed: false,
  previewAllowed: false,
  sendEnabled: false,
  sendDisabledReason: null,
  investigatedDestinations: [],
};

function commercialProposalFromWire(raw: unknown): CommercialProposalDeliveryWire {
  if (!raw || typeof raw !== "object") return DEFAULT_COMMERCIAL_PROPOSAL;
  const w = raw as CommercialProposalDeliveryWire;
  return {
    prepareAllowed: w.prepareAllowed === true,
    previewAllowed: w.previewAllowed === true,
    sendEnabled: w.sendEnabled === true,
    sendDisabledReason: w.sendDisabledReason ?? null,
    investigatedDestinations: Array.isArray(w.investigatedDestinations) ? w.investigatedDestinations : [],
  };
}

export type ProfAppealDetailRow = ProfAppealListRow & {
  remCard: ReceivingAppealRemCardDetailWire;
  clientCity: string | null;
  clientContact: string | null;
  budgetHint: string | null;
  privateNotes: string | null;
  commercialProposal: CommercialProposalDeliveryWire;
};

export type ProfAppealDetailState = {
  appeal: ProfAppealDetailRow;
  revision: number;
  history: ReceivingAppealHistoryEntry[];
  workingStages: ReceivingWorkingStage[];
  refusalReasons: string[];
  detailReadOnly: boolean;
};

export function mapProfHistoryFromWire(rows: ReceivingAppealHistoryWire[]): ReceivingAppealHistoryEntry[] {
  return (rows ?? []).map((h, index) => ({
    id: `hist_${index}_${h.at}`,
    at: h.at,
    authorLabel: h.authorLabel,
    text: h.text,
    reason: h.reason ?? null,
  }));
}

/** Map authoritative p149 list wire → UI row (also fills legacy ReceivingAppealListRow fields). */
export function mapProfAppealListItemWire(wire: ReceivingAppealListItemWire): ProfAppealListRow {
  const manualEntry = wire.originKind === "MANUAL";
  const interest = wire.requestText?.trim() || "—";
  const legacyCaps = parseReceivingRowCapabilities(wire.capabilities) ?? wire.capabilities;
  const profCapabilities = mergeProfCapabilities(legacyCaps, wire.p149Capabilities);
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
    capabilities: { canManageLeads: legacyCaps.canManageLeads, canScan: legacyCaps.canScan },
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
    remCard: { inCabinet: wire.remCard.inCabinet },
    profCapabilities,
  };
}

/** Only wire rows that carry p149 overlay — never legacy projection. */
export function coerceProfAppealsFromP149ListWire(appealsWire: unknown[]): ProfAppealListRow[] {
  return appealsWire.filter(isProfAppealListItemWire).map(mapProfAppealListItemWire);
}

export function parseProfAppealDetailWire(
  envelope: ReceivingAppealDetailEnvelopeWire,
  opts?: { scopeAll?: boolean },
): ProfAppealDetailState | null {
  const appealRaw = envelope.appeal as Record<string, unknown>;
  if (!isProfAppealListItemWire(appealRaw)) return null;

  const listRow = mapProfAppealListItemWire(appealRaw as ReceivingAppealListItemWire);
  const remWire = (appealRaw.remCard ?? {}) as ReceivingAppealRemCardDetailWire;
  const remDetail: ReceivingAppealRemCardDetailWire = {
    inCabinet: remWire.inCabinet === true,
    publicId: remWire.publicId?.trim() || undefined,
    inviteLoginUrl: remWire.inviteLoginUrl,
    certificateTermsAcceptedAt: remWire.certificateTermsAcceptedAt,
  };

  const envelopeP149 = parseP149Capabilities(
    (envelope as { p149Capabilities?: unknown }).p149Capabilities,
  );
  const profCaps = mergeProfCapabilities(
    parseReceivingRowCapabilities(envelope.capabilities ?? appealRaw.capabilities) ??
      (appealRaw.capabilities as ReceivingRowCapabilities),
    envelopeP149 ?? (appealRaw.p149Capabilities as ReceivingAppealP149CapabilitiesWire),
  );

  const commercialProposal = commercialProposalFromWire(
    (appealRaw as { commercialProposal?: unknown }).commercialProposal ??
      (envelope as { commercialProposal?: unknown }).commercialProposal,
  );

  const detailReadOnly =
    receivingDetailWireReadOnly(envelope, { scopeAll: opts?.scopeAll }) || !profCaps.canManageLeads;

  return {
    appeal: {
      ...listRow,
      profCapabilities: profCaps,
      remCard: remDetail,
      clientCity: (appealRaw.clientCity as string | null) ?? null,
      clientContact: (appealRaw.clientContact as string | null) ?? null,
      budgetHint: (appealRaw.budgetHint as string | null) ?? null,
      privateNotes: (appealRaw.privateNotes as string | null) ?? null,
      commercialProposal,
    },
    revision: typeof envelope.revision === "number" ? envelope.revision : Number(envelope.revision) || 0,
    history: mapProfHistoryFromWire(envelope.history ?? []),
    workingStages: envelope.workingStages ?? [],
    refusalReasons: envelope.refusalReasons ?? [],
    detailReadOnly,
  };
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

/** @deprecated use coerceProfAppealsFromP149ListWire */
export const coerceProfAppealsFromListWire = coerceProfAppealsFromP149ListWire;