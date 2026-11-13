/**
 * Partner UI alignment to K8 client appeals contract (revised receiving principal).
 * Canonical receiving key: `receivingPartnerUserId` (User.id). Org/branch optional scope only.
 */

import type { ReceivingAppealDetailDto } from "./ReceivingAppealDetailView";
import type { ReceivingAppealHistoryEntry } from "./ReceivingAppealHistory";

/** Revised K8 record — receiving CRM (includes private fields). */
export type ClientAppealRecordWire = {
  id: string;
  clientDisplayName: string;
  certificateId: string | null;
  /** Trusted receiving principal User.id (prototype receivingPartnerId). */
  receivingPartnerUserId: string;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  referrerProUserId: string | null;
  originKind: "CERTIFICATE" | "MANUAL";
  interest: string | null;
  clientContact: string | null;
  stageKey: string;
  refusedReason: string | null;
  updatedAt: string;
  createdAt: string;
  privateNotes: string | null;
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

export function receivingRecordToDetailDto(
  record: ClientAppealRecordWire,
  labels: { stageLabel: string; sourceLabel: string; referrerPartnerName: string | null },
): ReceivingAppealDetailDto {
  return {
    id: record.id,
    clientName: record.clientDisplayName,
    clientContact: record.clientContact,
    interest: record.interest,
    stageId: record.stageKey,
    stageLabel: labels.stageLabel,
    certificateId: record.certificateId,
    referrerPartnerName: labels.referrerPartnerName,
    sourceLabel: labels.sourceLabel,
    updatedAt: record.updatedAt,
    receivingPartnerUserId: record.receivingPartnerUserId,
    receivingOrganizationId: record.receivingOrganizationId ?? null,
    receivingBranchId: record.receivingBranchId ?? null,
  };
}
