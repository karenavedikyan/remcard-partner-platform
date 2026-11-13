import { RemcardApiError, remcardFetch } from "@/lib/api-client";

export type ReceivingAppealScannerWire = {
  appealId: string;
  revision: number;
  certificateId: string | null;
  purchaseOrderId: string | null;
  readOnly: boolean;
};

export type LoadReceivingAppealScannerContextResult =
  | { ok: true; wire: ReceivingAppealScannerWire }
  | { ok: false; status: number; code: string; message: string };

type DetailWireResponse = {
  appeal?: {
    id?: string;
    certificateId?: string | null;
    purchaseOrderId?: string | null;
  };
  revision?: number;
  access?: {
    readOnly?: boolean;
    listAllowed?: boolean;
  };
};

/** GET /api/pro/client-appeals/:id for scanner gate (synthetic / intercepted QA). */
export async function loadReceivingAppealScannerContext(
  appealId: string,
): Promise<LoadReceivingAppealScannerContextResult> {
  const trimmed = appealId.trim();
  if (!trimmed) {
    return { ok: false, status: 400, code: "VALIDATION", message: "appealId обязателен." };
  }
  try {
    const payload = await remcardFetch<DetailWireResponse>(
      `/api/pro/client-appeals/${encodeURIComponent(trimmed)}`,
      { method: "GET" },
    );
    const id = payload.appeal?.id?.trim();
    if (!id) {
      return { ok: false, status: 404, code: "NOT_FOUND", message: "Обращение не найдено." };
    }
    if (payload.access?.readOnly) {
      return { ok: false, status: 403, code: "READ_ONLY", message: "Обращение только для просмотра." };
    }
    const revision =
      typeof payload.revision === "number" && Number.isFinite(payload.revision)
        ? payload.revision
        : 0;
    return {
      ok: true,
      wire: {
        appealId: id,
        revision,
        certificateId: payload.appeal?.certificateId ?? null,
        purchaseOrderId: payload.appeal?.purchaseOrderId ?? null,
        readOnly: Boolean(payload.access?.readOnly),
      },
    };
  } catch (err) {
    if (err instanceof RemcardApiError) {
      const code = err.body?.code?.trim() || "ERROR";
      const message =
        err.body?.error?.trim() || err.body?.message?.trim() || err.message || "Ошибка загрузки.";
      return { ok: false, status: err.status, code, message };
    }
    return { ok: false, status: 0, code: "NETWORK", message: "Сетевая ошибка." };
  }
}

export function previewCertificateMatchesAppeal(
  appealCertificateId: string | null,
  previewCertificateId: string | null | undefined,
): boolean {
  const bound = appealCertificateId?.trim();
  if (!bound) return true;
  const preview = previewCertificateId?.trim();
  if (!preview) return false;
  return preview === bound;
}
