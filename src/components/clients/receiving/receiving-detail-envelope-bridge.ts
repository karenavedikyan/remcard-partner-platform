import type { ReceivingAppealDetailWire } from "@/lib/clients-parity/receiving-appeals-api";
import {
  k1ReceivingDetailEnvelopeToP4Mapped,
  type ClientAppealHistoryEventWire,
  type ClientAppealRecordWire,
  type K1ReceivingAppealDetailEnvelopeWire,
  type ReceivingAppealDetailMapped,
} from "./detail-contract-alignment";

function normalizeOriginKind(
  raw: string | null | undefined,
): ClientAppealRecordWire["originKind"] {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "manual" ? "MANUAL" : "CERTIFICATE";
}

/** P6 GET wire → K1 envelope for P4 `k1ReceivingDetailEnvelopeToP4Mapped` (no field drop). */
export function receivingAppealDetailWireToK1Envelope(
  wire: ReceivingAppealDetailWire,
): K1ReceivingAppealDetailEnvelopeWire {
  const a = wire.appeal;
  const appealId = a.id;
  const appeal: ClientAppealRecordWire = {
    id: appealId,
    clientDisplayName: (a.clientDisplayName ?? a.clientName ?? "").trim() || "—",
    certificateId: a.certificateId?.trim() || null,
    receivingPartnerUserId: (a.receivingPartnerUserId ?? a.receivingPartnerId ?? "").trim(),
    receivingOrganizationId: a.receivingOrganizationId ?? null,
    receivingBranchId: a.receivingBranchId ?? null,
    referrerProUserId: a.referrerProUserId ?? a.referrerPartnerId ?? null,
    referrerDisplayName: a.referrerDisplayName ?? null,
    stageLabel: a.stageLabel ?? null,
    originKind: normalizeOriginKind(a.originKind),
    manualSourceKey: a.manualSourceKey?.trim() || null,
    discountPercent: a.discountPercent ?? null,
    certValidUntil: a.certValidUntil ?? null,
    interest: a.interest?.trim() || null,
    clientCity: a.clientCity?.trim() || null,
    budgetHint: a.budgetHint?.trim() || null,
    clientContact: a.clientContact ?? null,
    stageKey: (a.stageKey ?? a.stageId ?? "").trim(),
    refusedReason: a.refusedReason?.trim() || null,
    shippedAt: a.shippedAt ?? null,
    purchaseOrderId: a.purchaseOrderId ?? a.purchaseId ?? null,
    paidAmountKopecks: a.paidAmountKopecks ?? null,
    paidAt: a.paidAt ?? null,
    privateNotes: a.privateNotes ?? null,
    createdAt: a.createdAt ?? new Date(0).toISOString(),
    updatedAt: a.updatedAt ?? new Date(0).toISOString(),
  };

  const history: ClientAppealHistoryEventWire[] = (wire.history ?? []).map((h, index) => ({
    id: `hist_${appealId}_${index}`,
    appealId,
    at: h.at,
    authorLabel: h.authorLabel,
    text: h.text,
    reason: h.reason ?? null,
  }));

  return {
    appeal,
    revision: typeof wire.revision === "number" ? wire.revision : Number(wire.revision) || 0,
    history,
    workingStages: wire.workingStages ?? [],
    refusalReasons: wire.refusalReasons ?? [],
  };
}

export function receivingAppealDetailWireToP4Mapped(
  wire: ReceivingAppealDetailWire,
  options?: { readOnly?: boolean; referrerPartnerName?: string | null },
): ReceivingAppealDetailMapped {
  return k1ReceivingDetailEnvelopeToP4Mapped(receivingAppealDetailWireToK1Envelope(wire), options);
}
