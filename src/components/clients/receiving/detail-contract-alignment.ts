/**
 * Partner UI alignment to navigator K8 `src/lib/clientAppeals/contract.ts` @ fc33b4fa.
 * Types are a structural mirror for P2/P6/K1 adapters — not a second source of truth.
 */

import type { ReceivingAppealDetailDto } from "./ReceivingAppealDetailView";
import type { ReceivingAppealHistoryEntry } from "./ReceivingAppealHistory";

/** Navigator: ClientAppealRecord (receiving CRM — includes private fields). */
export type ClientAppealRecordWire = {
  id: string;
  clientDisplayName: string;
  certificateId: string | null;
  receivingBranchId: string;
  receivingOrganizationId: string;
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
  receivingBranchId: string;
  receivingPartnerDisplayName: string;
  stageLabel: string;
  referralAt: string;
  updatedAt: string;
  refusedReason: string | null;
  publicTimeline: { at: string; text: string }[];
};

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
  };
}
