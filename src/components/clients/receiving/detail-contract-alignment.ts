/**
 * Partner UI alignment to K8 client appeals contract (revised receiving principal).
 * Canonical receiving key: `receivingPartnerUserId` (User.id). Org/branch optional scope only.
 * K8 @ 0f4fe833 `ClientAppealRecord`; K1 @ 5a51d7b7 detail GET envelope (read-only mirror).
 */

import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import { formatMoneyRub } from "@/lib/history-format";
import type {
  ReceivingAppealDetailDto,
  ReceivingAppealDetailReady,
} from "./ReceivingAppealDetailView";
import type { ReceivingAppealHistoryEntry } from "./ReceivingAppealHistory";

/** K8 `ClientAppealRecord` wire (receiving CRM — includes private + purchase projection). */
export type ClientAppealRecordWire = {
  id: string;
  clientDisplayName: string;
  certificateId: string | null;
  receivingPartnerUserId: string;
  receivingOrganizationId: string | null;
  receivingBranchId: string | null;
  referrerProUserId: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  manualSourceKey: string | null;
  discountPercent: number | null;
  certValidUntil: string | null;
  interest: string | null;
  clientCity: string | null;
  budgetHint: string | null;
  clientContact: string | null;
  stageKey: string;
  refusedReason: string | null;
  shippedAt: string | null;
  purchaseOrderId: string | null;
  paidAmountKopecks: number | null;
  paidAt: string | null;
  privateNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

/** K1 GET `/api/pro/client-appeals/:id` — history and revision are top-level (not on `appeal`). */
export type K1ReceivingAppealDetailEnvelopeWire = {
  appeal: ClientAppealRecordWire;
  revision: number;
  history: ClientAppealHistoryEventWire[];
  workingStages: ClientAppealWorkingStageWire[];
  refusalReasons: string[];
};

export type ClientAppealWorkingStageWire = { id: string; label: string };

export type ReceivingAppealDetailMapped = ReceivingAppealDetailReady & {
  revision: number;
  workingStages: ClientAppealWorkingStageWire[];
  refusalReasons: string[];
};

/** Observer list/detail partner column — receiving principal profile, not Branch.id. */
export type ReceivingPartnerPrincipalWire = {
  receivingPartnerUserId: string;
  displayName: string;
  city?: string | null;
  category?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
};

/** Prototype `isActiveAppeal` — certificate slot uniqueness (K8 DB must match). */
export const CLIENT_APPEAL_INACTIVE_STAGE_KEYS = ["sys_refused", "sys_return", "refused", "return"] as const;

const CLIENT_APPEAL_SYSTEM_STAGE_LABELS: Record<string, string> = {
  sys_new: "Новое",
  sys_paid: "Оплачено",
  sys_shipped: "Отгружено",
  sys_return: "Возврат",
  sys_refused: "Отказ",
};

const MANUAL_SOURCE_LABELS: Record<string, string> = {
  phone: "Звонок",
  messenger: "Мессенджер",
  visit: "Личный визит",
  ads: "Реклама",
  other: "Другое",
  scan: "Скан",
};

export function isActiveAppealStage(stageKey: string): boolean {
  const key = stageKey.trim().toLowerCase();
  const inactive = new Set<string>([
    "sys_refused",
    "sys_return",
    "refused",
    "return",
  ]);
  return !inactive.has(key);
}

/** Navigator: ClientAppealHistoryEvent */
export type ClientAppealHistoryEventWire = {
  id: string;
  appealId: string;
  at: string;
  authorLabel: string;
  text: string;
  reason?: string | null;
};

/**
 * K2 observer-safe detail — MUST NOT include privateNotes, clientContact, paidAmountKopecks.
 * Navigator K2 routes strip these before partner proxy response.
 */
export type ObserverReferrerAppealDetailWire = {
  id: string;
  clientDisplayName: string;
  interest: string | null;
  certificateId: string | null;
  receivingPartnerUserId: string;
  receivingPartnerDisplayName: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  stageLabel: string;
  referralAt: string;
  updatedAt: string;
  refusedReason: string | null;
  publicTimeline: { at: string; text: string }[];
};

/** @deprecated P6 must pass K1 envelope to `k1ReceivingDetailEnvelopeToP4Mapped` (P6 @ 4dca7af7 fetch). */
export type P6ReceivingAppealDetailWire = {
  id: string;
  clientName: string;
  certificateId: string;
  receivingPartnerUserId: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  interest: string;
  clientContact?: string | null;
  stageId: string;
  updatedAt: string;
  history: { at: string; author: string; text: string; reason?: string }[];
  paidAmount?: number | null;
  paidAt?: string | null;
  purchaseId?: string | null;
};

export function resolveClientAppealStageLabel(
  stageKey: string,
  workingStages: ClientAppealWorkingStageWire[],
): string {
  const key = stageKey.trim();
  const custom = workingStages.find((s) => s.id === key);
  if (custom?.label?.trim()) return custom.label.trim();
  return CLIENT_APPEAL_SYSTEM_STAGE_LABELS[key] ?? key;
}

export function resolveClientAppealSourceLabel(record: Pick<ClientAppealRecordWire, "originKind" | "manualSourceKey">): string {
  if (record.originKind === "CERTIFICATE") return "По сертификату";
  const manual = record.manualSourceKey?.trim();
  if (manual && MANUAL_SOURCE_LABELS[manual]) return MANUAL_SOURCE_LABELS[manual]!;
  return manual ? `Вручную: ${manual}` : "Вручную";
}

export function clientPurchaseDisplayFromRecord(
  record: Pick<ClientAppealRecordWire, "paidAmountKopecks" | "paidAt">,
): Pick<ReceivingAppealDetailDto, "paidDisplayLabel" | "paidAtDisplay"> {
  if (record.paidAmountKopecks == null) return {};
  return {
    paidDisplayLabel: formatMoneyRub(record.paidAmountKopecks / 100),
    paidAtDisplay: record.paidAt ? formatObserverDateTime(record.paidAt) : null,
  };
}

export function receivingPartnerPrincipalToObserverMeta(
  p: ReceivingPartnerPrincipalWire,
): { id: string; name: string; city?: string | null; category?: string | null } {
  return {
    id: p.receivingPartnerUserId,
    name: p.displayName,
    city: p.city ?? null,
    category: p.category ?? null,
  };
}

export function historyEventWireToUi(e: ClientAppealHistoryEventWire): ReceivingAppealHistoryEntry {
  return {
    at: e.at,
    text: e.text,
    reason: e.reason ?? null,
    author: e.authorLabel,
  };
}

/** Canonical path: K1 detail GET → P4 detail props (P6 fetch only; no nested history on appeal). */
export function k1ReceivingDetailEnvelopeToP4Mapped(
  envelope: K1ReceivingAppealDetailEnvelopeWire,
  options?: { referrerPartnerName?: string | null; readOnly?: boolean },
): ReceivingAppealDetailMapped {
  const stageLabel = resolveClientAppealStageLabel(envelope.appeal.stageKey, envelope.workingStages);
  const sourceLabel = resolveClientAppealSourceLabel(envelope.appeal);
  const appeal: ReceivingAppealDetailDto = {
    ...receivingRecordToDetailDto(
      envelope.appeal,
      {
        stageLabel,
        sourceLabel,
        referrerPartnerName: options?.referrerPartnerName ?? null,
      },
      { includePrivateFields: !options?.readOnly },
    ),
    ...clientPurchaseDisplayFromRecord(envelope.appeal),
  };
  const history = envelope.history.map(historyEventWireToUi);
  return {
    status: "ready",
    appeal,
    history,
    readOnly: options?.readOnly,
    revision: envelope.revision,
    workingStages: envelope.workingStages,
    refusalReasons: envelope.refusalReasons,
  };
}

/** Legacy shim until P6 detail fetch returns K1 envelope — do not use for new wiring. */
export function p6ReceivingDetailToP4Ready(
  detail: P6ReceivingAppealDetailWire,
  labels: { stageLabel: string; sourceLabel: string; referrerPartnerName: string | null },
): ReceivingAppealDetailReady {
  const appeal: ReceivingAppealDetailDto = {
    id: detail.id,
    clientName: detail.clientName,
    clientContact: detail.clientContact ?? null,
    interest: detail.interest,
    stageId: detail.stageId,
    stageLabel: labels.stageLabel,
    certificateId: detail.certificateId,
    referrerPartnerName: labels.referrerPartnerName,
    sourceLabel: labels.sourceLabel,
    updatedAt: detail.updatedAt,
    receivingPartnerUserId: detail.receivingPartnerUserId,
    receivingOrganizationId: detail.receivingOrganizationId ?? null,
    receivingBranchId: detail.receivingBranchId ?? null,
  };
  const history: ReceivingAppealHistoryEntry[] = detail.history.map((h) => ({
    at: h.at,
    text: h.text,
    reason: h.reason ?? null,
    author: h.author,
  }));
  return { status: "ready", appeal, history, readOnly: false };
}

export function receivingRecordToDetailDto(
  record: ClientAppealRecordWire,
  labels: { stageLabel: string; sourceLabel: string; referrerPartnerName: string | null },
  options?: { includePrivateFields?: boolean },
): ReceivingAppealDetailDto {
  const includePrivate = options?.includePrivateFields !== false;
  return {
    id: record.id,
    clientName: record.clientDisplayName,
    clientContact: record.clientContact,
    interest: record.interest,
    clientCity: record.clientCity,
    budgetHint: record.budgetHint,
    stageId: record.stageKey,
    stageLabel: labels.stageLabel,
    certificateId: record.certificateId,
    referrerPartnerName: labels.referrerPartnerName,
    sourceLabel: labels.sourceLabel,
    updatedAt: record.updatedAt,
    originKind: record.originKind,
    discountPercent: record.discountPercent,
    certValidUntil: record.certValidUntil,
    certValidUntilDisplay: record.certValidUntil
      ? formatObserverDateTime(record.certValidUntil)
      : null,
    privateNotes: includePrivate ? record.privateNotes : null,
    purchaseOrderId: record.purchaseOrderId,
    receivingPartnerUserId: record.receivingPartnerUserId,
    receivingOrganizationId: record.receivingOrganizationId,
    receivingBranchId: record.receivingBranchId,
  };
}
