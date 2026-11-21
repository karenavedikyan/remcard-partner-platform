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
import {
  mapReceivingHistoryFromWire,
  parseReceivingRowCapabilities,
  receivingDetailWireReadOnly,
} from "./receiving-appeals-api";

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
  receivingBranchLabel?: string | null;
  createdByLabel?: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  paidAmountKopecks?: number | null;
  referrerDisplayName?: string | null;
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
  receivingBranchLabel?: string | null;
  createdByLabel?: string | null;
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
  const source = filters.appealSourceKey?.trim();
  if (source && source !== "all") params.set("manualSourceKey", source);
  const request = filters.requestFilter?.trim();
  if (request && request !== "Все") params.set("requestText", request);
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
  responsibleOptions: ReceivingAppealResponsibleWire[];
};

export function parseResponsibleOptionsWire(raw: unknown): ReceivingAppealResponsibleWire[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is ReceivingAppealResponsibleWire => {
      if (!item || typeof item !== "object") return false;
      const o = item as Record<string, unknown>;
      return typeof o.userId === "string" && typeof o.displayLabel === "string";
    })
    .map((o) => ({
      userId: o.userId.trim(),
      displayLabel: o.displayLabel.trim(),
    }))
    .filter((o) => o.userId.length > 0 && o.displayLabel.length > 0);
}

/** Shared assignable staff across bulk-selected appeals (intersection by userId). */
export function intersectResponsibleOptions(
  lists: ReceivingAppealResponsibleWire[][],
): ReceivingAppealResponsibleWire[] {
  if (lists.length === 0) return [];
  const [first, ...rest] = lists;
  if (!first?.length) return [];
  if (rest.length === 0) return [...first];
  return first.filter((opt) => rest.every((list) => list.some((o) => o.userId === opt.userId)));
}

export function mapProfHistoryFromWire(rows: ReceivingAppealHistoryWire[]): ReceivingAppealHistoryEntry[] {
  return mapReceivingHistoryFromWire(rows ?? []);
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
    referrerDisplayName: typeof wire.referrerDisplayName === "string" ? wire.referrerDisplayName.trim() || null : null,
    paidAmountKopecks:
      typeof wire.paidAmountKopecks === "number" && Number.isSafeInteger(wire.paidAmountKopecks) && wire.paidAmountKopecks >= 0
        ? wire.paidAmountKopecks
        : null,
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
    receivingBranchLabel: wire.receivingBranchLabel ?? null,
    createdByLabel: wire.createdByLabel ?? null,
    originKind: wire.originKind,
    remCard: { inCabinet: wire.remCard.inCabinet },
    profCapabilities,
  };
}

/** Only wire rows that carry p149 overlay — never legacy projection. */
export function coerceProfAppealsFromP149ListWire(appealsWire: unknown[]): ProfAppealListRow[] {
  return appealsWire.filter(isProfAppealListItemWire).map(mapProfAppealListItemWire);
}

/** Append pages for p149 table — dedupe by appeal id (stable order: first page, then new rows). */
export function mergeProfAppealPages(prev: ProfAppealListRow[], next: ProfAppealListRow[]): ProfAppealListRow[] {
  const byId = new Map(prev.map((row) => [row.id, row]));
  for (const row of next) byId.set(row.id, row);
  return [...byId.values()];
}

export function parseProfAppealDetailWire(
  envelope: ReceivingAppealDetailEnvelopeWire,
  opts?: { scopeAll?: boolean },
): ProfAppealDetailState | null {
  if (!isProfAppealListItemWire(envelope.appeal)) return null;
  const profileFields = envelope.appeal as Record<string, unknown>;
  const appealWire = envelope.appeal as ReceivingAppealListItemWire;
  const listRow = mapProfAppealListItemWire(appealWire);
  const remWire = (profileFields.remCard ?? {}) as ReceivingAppealRemCardDetailWire;
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
    parseReceivingRowCapabilities(envelope.capabilities ?? appealWire.capabilities) ??
      appealWire.capabilities,
    envelopeP149 ?? appealWire.p149Capabilities,
  );

  const commercialProposal = commercialProposalFromWire(
    profileFields.commercialProposal ?? (envelope as { commercialProposal?: unknown }).commercialProposal,
  );

  const detailReadOnly =
    receivingDetailWireReadOnly(envelope, { scopeAll: opts?.scopeAll }) || !profCaps.canManageLeads;

  const responsibleOptions = detailReadOnly
    ? []
    : parseResponsibleOptionsWire((envelope as { responsibleOptions?: unknown }).responsibleOptions);

  return {
    appeal: {
      ...listRow,
      profCapabilities: profCaps,
      remCard: remDetail,
      receivingBranchLabel:
        appealWire.receivingBranchLabel?.trim() || listRow.receivingBranchLabel?.trim() || null,
      createdByLabel: appealWire.createdByLabel?.trim() || listRow.createdByLabel?.trim() || null,
      clientCity: (profileFields.clientCity as string | null | undefined) ?? null,
      clientContact: (profileFields.clientContact as string | null | undefined) ?? null,
      budgetHint: (profileFields.budgetHint as string | null | undefined) ?? null,
      privateNotes: (profileFields.privateNotes as string | null | undefined) ?? null,
      commercialProposal,
    },
    revision: typeof envelope.revision === "number" ? envelope.revision : Number(envelope.revision) || 0,
    history: mapProfHistoryFromWire(envelope.history ?? []),
    workingStages: envelope.workingStages ?? [],
    refusalReasons: envelope.refusalReasons ?? [],
    detailReadOnly,
    responsibleOptions,
  };
}

export function profAppealRowSubtitle(row: ProfAppealListRow, branchLabel?: string | null): string {
  const parts: string[] = [];
  const client = row.clientDisplayName?.trim() || row.clientName?.trim();
  if (client && client !== "—") parts.push(client);
  const tail = row.id.replace(/^appeal-/, "").slice(-4);
  if (tail) parts.push(`№ ${tail}`);
  const branch = row.receivingBranchLabel?.trim() || branchLabel?.trim();
  if (branch) parts.push(branch);
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

const norm = (v: string | null | undefined): string => (v ?? "").trim();

/** Only keys that changed — never send manualSourceKey unless MANUAL and changed. */
export function buildProfProfilePatchBody(
  baseline: ProfAppealProfilePatchBody & {
    originKind: "CERTIFICATE" | "MANUAL";
    externalRefs?: ReceivingAppealExternalRefWire[];
    responsibleUserId?: string | null;
  },
  draft: ProfAppealProfilePatchBody & {
    originKind: "CERTIFICATE" | "MANUAL";
    externalRefs?: ReceivingAppealExternalRefWire[];
    responsibleUserId?: string | null;
  },
  revision: string | number,
): ProfAppealProfilePatchBody {
  const body: ProfAppealProfilePatchBody = { expectedRevision: revision };
  const put = <K extends keyof ProfAppealProfilePatchBody>(key: K, next: ProfAppealProfilePatchBody[K]) => {
    body[key] = next;
  };
  if (norm(draft.appealTitle as string) !== norm(baseline.appealTitle as string)) {
    put("appealTitle", norm(draft.appealTitle as string) || null);
  }
  if (norm(draft.clientDisplayName) !== norm(baseline.clientDisplayName)) {
    const v = norm(draft.clientDisplayName);
    if (v) put("clientDisplayName", v);
  }
  if (norm(draft.interest as string) !== norm(baseline.interest as string)) {
    put("interest", norm(draft.interest as string) || null);
  }
  if (norm(draft.clientCity as string) !== norm(baseline.clientCity as string)) {
    put("clientCity", norm(draft.clientCity as string) || null);
  }
  if (norm(draft.clientContact as string) !== norm(baseline.clientContact as string)) {
    put("clientContact", norm(draft.clientContact as string) || null);
  }
  if (norm(draft.budgetHint as string) !== norm(baseline.budgetHint as string)) {
    put("budgetHint", norm(draft.budgetHint as string) || null);
  }
  if (norm(draft.privateNotes as string) !== norm(baseline.privateNotes as string)) {
    put("privateNotes", norm(draft.privateNotes as string) || null);
  }
  if (norm(draft.erpDocumentNumber as string) !== norm(baseline.erpDocumentNumber as string)) {
    put("erpDocumentNumber", norm(draft.erpDocumentNumber as string) || null);
  }
  if (
    draft.originKind === "MANUAL" &&
    norm(draft.manualSourceKey as string) !== norm(baseline.manualSourceKey as string)
  ) {
    const v = norm(draft.manualSourceKey as string);
    if (v) put("manualSourceKey", v);
  }
  if (draft.responsibleUserId !== undefined && draft.responsibleUserId !== baseline.responsibleUserId) {
    put("responsibleUserId", draft.responsibleUserId?.trim() || null);
  }
  if (draft.externalRefs && JSON.stringify(draft.externalRefs) !== JSON.stringify(baseline.externalRefs)) {
    put("externalRefs", draft.externalRefs);
  }
  return body;
}

export function profProfilePatchHasFieldChanges(body: ProfAppealProfilePatchBody): boolean {
  return Object.keys(body).some((key) => key !== "expectedRevision");
}

export type ProfBulkProfileOverlayInput = {
  appealTitle?: string;
  clientDisplayName?: string;
  requestText?: string;
  clientCity?: string;
  clientContact?: string;
  budgetHint?: string;
  erpDocumentNumber?: string;
  manualSourceKey?: string;
  responsibleUserId?: string;
};

/** Apply bulk CRM draft onto a row baseline — only non-empty keys; MANUAL-only source. */
export function overlayProfBulkDraftOnBaseline(
  baseline: ProfAppealProfilePatchBody & {
    originKind: "CERTIFICATE" | "MANUAL";
    externalRefs?: ReceivingAppealExternalRefWire[];
    responsibleUserId?: string | null;
  },
  draft: ProfBulkProfileOverlayInput,
): (ProfAppealProfilePatchBody & {
  originKind: "CERTIFICATE" | "MANUAL";
  externalRefs?: ReceivingAppealExternalRefWire[];
  responsibleUserId?: string | null;
}) | null {
  const next = { ...baseline };
  let touched = false;
  const put = (apply: () => void) => {
    apply();
    touched = true;
  };
  const t = (v: string | undefined) => v?.trim() ?? "";
  if (t(draft.appealTitle)) put(() => { next.appealTitle = t(draft.appealTitle); });
  if (t(draft.clientDisplayName)) put(() => { next.clientDisplayName = t(draft.clientDisplayName); });
  if (t(draft.requestText)) put(() => { next.interest = t(draft.requestText); });
  if (t(draft.clientCity)) put(() => { next.clientCity = t(draft.clientCity); });
  if (t(draft.clientContact)) put(() => { next.clientContact = t(draft.clientContact); });
  if (t(draft.budgetHint)) put(() => { next.budgetHint = t(draft.budgetHint); });
  if (t(draft.erpDocumentNumber)) put(() => { next.erpDocumentNumber = t(draft.erpDocumentNumber); });
  if (baseline.originKind === "MANUAL" && t(draft.manualSourceKey)) {
    put(() => { next.manualSourceKey = t(draft.manualSourceKey); });
  }
  if (t(draft.responsibleUserId)) put(() => { next.responsibleUserId = t(draft.responsibleUserId); });
  return touched ? next : null;
}

export function profBaselineFromDetailState(
  detail: ProfAppealDetailState,
): ProfAppealProfilePatchBody & {
  originKind: "CERTIFICATE" | "MANUAL";
  externalRefs: ReceivingAppealExternalRefWire[];
  responsibleUserId: string | null;
} {
  const a = detail.appeal;
  return {
    originKind: a.originKind,
    expectedRevision: detail.revision,
    appealTitle: a.appealTitle,
    clientDisplayName: a.clientDisplayName || undefined,
    interest: a.requestText,
    clientCity: a.clientCity,
    clientContact: a.clientContact,
    budgetHint: a.budgetHint,
    erpDocumentNumber: a.erpDocumentNumber,
    manualSourceKey: a.manualSourceKey,
    privateNotes: a.privateNotes,
    externalRefs: a.externalRefs.map((ref) => ({ ...ref })),
    responsibleUserId: a.responsible?.userId?.trim() || null,
  };
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
