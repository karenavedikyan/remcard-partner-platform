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

/** K1 `MAX_DATE_EPOCH_MS` — CAS revision must stay within representable Date bounds. */
export const RECEIVING_APPEAL_REVISION_MAX_MS = 8_640_000_000_000_000;

export function scannerAppealParamSignature(param: ScannerAppealParam): string {
  if (param.mode === "scoped") {
    return `scoped:${param.appealId}`;
  }
  return param.mode;
}

export function scannerAppealInputSignature(
  input: ScannerAppealParam | string | null | undefined,
): string {
  if (input === null || input === undefined) {
    return "none";
  }
  if (typeof input === "string") {
    return scannerAppealParamSignature(parseScannerAppealParam(input));
  }
  return scannerAppealParamSignature(input);
}

/** P4 `725e7c47` `assertReceivingAppealId` — owned mirror for scanner query preflight. */
const UNSAFE_APPEAL_ID = /[\s#?&/\\]|^(?:https?:|\/\/)/i;

export function assertReceivingAppealId(appealId: string): string | null {
  const id = appealId.trim();
  if (!id || UNSAFE_APPEAL_ID.test(id)) {
    return null;
  }
  return id;
}

function revisionWithinDateBounds(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0 && n <= RECEIVING_APPEAL_REVISION_MAX_MS;
}

export function parseReceivingAppealRevision(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") {
    return revisionWithinDateBounds(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text || !/^\d+$/.test(text)) {
      return null;
    }
    const maxBi = BigInt(RECEIVING_APPEAL_REVISION_MAX_MS);
    let bi: bigint;
    try {
      bi = BigInt(text);
    } catch {
      return null;
    }
    if (bi < BigInt(0) || bi > maxBi) {
      return null;
    }
    const n = Number(bi);
    if (!revisionWithinDateBounds(n) || BigInt(n) !== bi) {
      return null;
    }
    return n;
  }
  return null;
}

export function parseScannerAppealQueryValues(values: readonly string[]): ScannerAppealParam {
  if (values.length === 0) {
    return { mode: "none" };
  }
  const nonempty = values.map((v) => v.trim()).filter(Boolean);
  if (nonempty.length === 0) {
    return { mode: "invalid" };
  }
  const unique = new Set(nonempty);
  if (unique.size > 1) {
    return { mode: "invalid" };
  }
  const id = assertReceivingAppealId(nonempty[0]!);
  if (!id) {
    return { mode: "invalid" };
  }
  return { mode: "scoped", appealId: id };
}

export function parseScannerAppealParam(raw: string | null | undefined): ScannerAppealParam {
  if (raw === null || raw === undefined) {
    return { mode: "none" };
  }
  return parseScannerAppealQueryValues([raw]);
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
  return receivingAppealPurchaseDetailHref(purchaseOrderId, appealId);
}

const RECEIVING_TERMINAL_STAGE_KEYS = new Set(["sys_return", "sys_refused"]);

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
  if (appeal.id.trim() !== trimmed) {
    return {
      status: "error",
      appealId: trimmed,
      message: "Ответ сервера не соответствует запрошенному обращению.",
    };
  }

  const revision = parseReceivingAppealRevision(res.wire.revision);
  if (revision === null) {
    return {
      status: "error",
      appealId: trimmed,
      message: "Некорректная ревизия обращения.",
    };
  }

  const stageKey = (appeal.stageKey ?? appeal.stageId ?? "").trim();
  if (stageKey && RECEIVING_TERMINAL_STAGE_KEYS.has(stageKey)) {
    return {
      status: "forbidden",
      appealId: trimmed,
      message: "Обращение закрыто — оформление покупки недоступно.",
    };
  }

  const origin = (appeal.originKind ?? appeal.sourceKey ?? "").toString().toLowerCase();
  const certId = appeal.certificateId?.trim() || null;
  if ((origin === "certificate" || origin.includes("cert")) && !certId) {
    return {
      status: "forbidden",
      appealId: trimmed,
      message: "У сертификатного обращения нет привязанного сертификата.",
    };
  }

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
