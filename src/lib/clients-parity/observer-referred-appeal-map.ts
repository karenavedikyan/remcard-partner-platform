import type { ObserverReferredAppeal } from "./types";
import {
  resolveClientAppealStageDisplayLabel,
  trimTrustedClientsDisplayString,
} from "./client-appeal-display";

function readStageKey(row: Record<string, unknown>): string {
  if (typeof row.stageKey === "string" && row.stageKey.trim()) return row.stageKey.trim();
  if (typeof row.stageId === "string" && row.stageId.trim()) return row.stageId.trim();
  return "sys_new";
}

/**
 * K2 list row → observer view-model. Expects optional `stageLabel`, `referrerDisplayName` on wire.
 */
export function mapObserverReferredAppealFromWire(
  row: Record<string, unknown>,
): ObserverReferredAppeal | null {
  const id = typeof row.id === "string" ? row.id : "";
  const clientName =
    typeof row.clientDisplayName === "string"
      ? row.clientDisplayName
      : typeof row.clientName === "string"
        ? row.clientName
        : "";
  const receivingPartnerId =
    typeof row.receivingPartnerUserId === "string"
      ? row.receivingPartnerUserId
      : typeof row.receivingPartnerId === "string"
        ? row.receivingPartnerId
        : "";
  const referrerPartnerId =
    typeof row.referrerProUserId === "string"
      ? row.referrerProUserId
      : typeof row.referrerPartnerId === "string"
        ? row.referrerPartnerId
        : "";
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
  if (!id || !clientName.trim() || !receivingPartnerId.trim() || !updatedAt) {
    return null;
  }

  const stageKey = readStageKey(row);
  const stageLabelWire = trimTrustedClientsDisplayString(row.stageLabel);
  const stageLabel = resolveClientAppealStageDisplayLabel({
    stageKey,
    trustedStageLabel: stageLabelWire,
  });
  const referrerDisplayName = trimTrustedClientsDisplayString(row.referrerDisplayName);

  return {
    id,
    clientName: clientName.trim(),
    interest: typeof row.interest === "string" ? row.interest : row.interest === null ? null : undefined,
    certificateId:
      typeof row.certificateId === "string"
        ? row.certificateId
        : row.certificateId === null
          ? null
          : undefined,
    receivingPartnerId: receivingPartnerId.trim(),
    referrerPartnerId: referrerPartnerId.trim() || "session-viewer",
    updatedAt,
    referralAt:
      typeof row.referralAt === "string"
        ? row.referralAt
        : typeof row.createdAt === "string"
          ? row.createdAt
          : row.referralAt === null
            ? null
            : undefined,
    stageId: stageKey,
    stageLabel,
    referrerDisplayName: referrerDisplayName ?? null,
  };
}