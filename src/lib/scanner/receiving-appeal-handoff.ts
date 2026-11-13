import { parseCertificateCode } from "@/lib/certificate-code";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import {
  RECEIVING_ACCESS_LIST_ONLY_DENIAL,
  fetchReceivingAppealDetailWire,
  normalizeReceivingAccess,
  type ReceivingAppealDetailRowWire,
  type ReceivingAppealDetailWire,
} from "@/lib/clients-parity/receiving-appeals-api";
import { receivingAppealPurchaseDetailHref } from "@/components/clients/receiving/receiving-detail-actions-contract";

export type ReceivingAppealScannerContext =
  | { status: "idle" }
  | { status: "invalid_param"; message: string }
  | { status: "loading"; appealId: string }
  | {
      status: "ready";
      appealId: string;
      revision: number;
      certificateId: string | null;
      certificatePrefillCode: string | null;
      purchaseOrderId: string | null;
      clientLabel: string;
      orderAlreadyLinked: boolean;
    }
  | { status: "forbidden"; appealId: string; message: string }
  | { status: "not_found"; appealId: string; message: string }
  | { status: "blocked"; appealId: string; message: string }
  | { status: "error"; appealId: string; message: string };

export type ScannerAppealParam = { mode: "none" } | { mode: "invalid" } | { mode: "scoped"; appealId: string };

export function parseScannerAppealParam(raw: string | null | undefined): ScannerAppealParam {
  if (raw === null || raw === undefined) {
    return { mode: "none" };
  }
  if (raw.trim() === "") {
    return { mode: "invalid" };
  }
  return { mode: "scoped", appealId: raw.trim() };
}

/** @deprecated use parseScannerAppealParam */
export function parseScannerAppealId(raw: string | null | undefined): string | null {
  const p = parseScannerAppealParam(raw);
  return p.mode === "scoped" ? p.appealId : null;
}

export function receivingAppealPurchaseDetailHrefForReturn(
  purchaseOrderId: string,
  appealId: string,
): string {
  const base = receivingAppealPurchaseDetailHref(purchaseOrderId);
  return `${base}?receivingAppealId=${encodeURIComponent(appealId.trim())}`;
}

export function receivingCertificateMatchesPreview(
  boundCertificateId: string | null | undefined,
  preview: OrderPreviewAllowed,
): boolean {
  const bound = boundCertificateId?.trim();
  if (!bound) return true;
  return preview.certificate.id === bound;
}

function detailWriteAllowed(wire: ReceivingAppealDetailWire): boolean {
  if (wire.readOnly === true) {
    return false;
  }
  if (wire.access) {
    return normalizeReceivingAccess(wire.access).mutationsAllowed;
  }
  return wire.readOnly === false;
}

function extractAuthoritativeScanCode(appeal: ReceivingAppealDetailRowWire): string | null {
  const promo =
    appeal.certificatePromoCode?.trim() ||
    (typeof appeal.interest === "string" && appeal.interest.startsWith("RC-")
      ? appeal.interest.trim()
      : null);
  if (!promo) {
    return null;
  }
  const parsed = parseCertificateCode(promo);
  return parsed.ok ? parsed.code : null;
}

export async function loadReceivingAppealScannerContext(
  appealId: string,
): Promise<ReceivingAppealScannerContext> {
  const trimmed = appealId.trim();
  if (!trimmed) {
    return { status: "invalid_param", message: "Некорректный идентификатор обращения." };
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

  if (!detailWriteAllowed(res.wire)) {
    return {
      status: "forbidden",
      appealId: trimmed,
      message: RECEIVING_ACCESS_LIST_ONLY_DENIAL,
    };
  }

  const appeal = res.wire.appeal;
  const revision =
    typeof res.wire.revision === "number" ? res.wire.revision : Number(res.wire.revision) || 0;
  const purchaseOrderId = appeal.purchaseOrderId?.trim() || appeal.purchaseId?.trim() || null;

  return {
    status: "ready",
    appealId: trimmed,
    revision,
    certificateId: appeal.certificateId?.trim() || null,
    certificatePrefillCode: extractAuthoritativeScanCode(appeal),
    purchaseOrderId,
    clientLabel: (appeal.clientDisplayName ?? appeal.clientName ?? trimmed).trim() || trimmed,
    orderAlreadyLinked: Boolean(purchaseOrderId),
  };
}
