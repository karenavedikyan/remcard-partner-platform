import type { OrderPreviewAllowed } from "@/lib/order-types";
import { fetchReceivingAppealDetailWire } from "@/lib/clients-parity/receiving-appeals-api";

export type ReceivingAppealScannerContext =
  | { status: "idle" }
  | { status: "loading"; appealId: string }
  | {
      status: "ready";
      appealId: string;
      revision: number;
      certificateId: string | null;
      purchaseOrderId: string | null;
      clientLabel: string;
    }
  | { status: "forbidden"; appealId: string; message: string }
  | { status: "not_found"; appealId: string; message: string }
  | { status: "blocked"; appealId: string; message: string }
  | { status: "error"; appealId: string; message: string };

export function parseScannerAppealId(raw: string | null | undefined): string | null {
  const id = raw?.trim();
  return id ? id : null;
}

export function receivingCertificateMatchesPreview(
  boundCertificateId: string | null | undefined,
  preview: OrderPreviewAllowed,
): boolean {
  const bound = boundCertificateId?.trim();
  if (!bound) return true;
  return preview.certificate.id === bound;
}

export async function loadReceivingAppealScannerContext(
  appealId: string,
): Promise<ReceivingAppealScannerContext> {
  const trimmed = appealId.trim();
  if (!trimmed) {
    return { status: "idle" };
  }

  const res = await fetchReceivingAppealDetailWire(trimmed);
  if (!res.ok) {
    if (res.code === "NOT_FOUND") {
      return { status: "not_found", appealId: trimmed, message: res.message };
    }
    if (res.code === "BLOCKED_CONTRACT") {
      return { status: "blocked", appealId: trimmed, message: res.message };
    }
    return { status: "error", appealId: trimmed, message: res.message };
  }

  const appeal = res.wire.appeal;
  const revision =
    typeof res.wire.revision === "number" ? res.wire.revision : Number(res.wire.revision) || 0;

  return {
    status: "ready",
    appealId: trimmed,
    revision,
    certificateId: appeal.certificateId?.trim() || null,
    purchaseOrderId: appeal.purchaseOrderId?.trim() || appeal.purchaseId?.trim() || null,
    clientLabel: (appeal.clientDisplayName ?? appeal.clientName ?? trimmed).trim() || trimmed,
  };
}
