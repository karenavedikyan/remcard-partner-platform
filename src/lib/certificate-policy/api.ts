import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CERTIFICATE_POLICY_API_PATH } from "./routes";
import type {
  CertificatePolicyApiErrorCode,
  CertificatePolicyIndividualDocument,
  CertificatePolicyPatchBody,
  CertificatePolicyWorkspace,
} from "./types";

export type CertificatePolicyLoadResult =
  | { ok: true; workspace: CertificatePolicyWorkspace }
  | {
      ok: false;
      code: CertificatePolicyApiErrorCode | "ERROR";
      message: string;
      httpStatus?: number;
      workspace?: CertificatePolicyWorkspace;
    };

export type CertificatePolicyPatchResult =
  | { ok: true; workspace: CertificatePolicyWorkspace }
  | {
      ok: false;
      code: CertificatePolicyApiErrorCode | "ERROR";
      message: string;
      httpStatus?: number;
      /** When backend returns 409 + current workspace snapshot for OCC recovery. */
      workspace?: CertificatePolicyWorkspace;
    };

export async function fetchCertificatePolicyWorkspace(
  actorUserId?: string,
): Promise<CertificatePolicyLoadResult> {
  try {
    const q = actorUserId?.trim()
      ? `?actorUserId=${encodeURIComponent(actorUserId.trim())}`
      : "";
    const workspace = await remcardFetch<CertificatePolicyWorkspace>(
      `${CERTIFICATE_POLICY_API_PATH}${q}`,
    );
    return { ok: true, workspace };
  } catch (caught) {
    return mapCertificatePolicyError(caught, "Не удалось загрузить условия сертификатов.");
  }
}

export async function patchCertificatePolicy(
  body: CertificatePolicyPatchBody,
): Promise<CertificatePolicyPatchResult> {
  try {
    const workspace = await remcardFetch<CertificatePolicyWorkspace>(CERTIFICATE_POLICY_API_PATH, {
      method: "PATCH",
      body,
    });
    return { ok: true, workspace };
  } catch (caught) {
    return mapCertificatePolicyError(caught, "Не удалось сохранить условия.");
  }
}

export async function fetchIndividualCertificatePolicy(
  counterpartyUserId: string,
): Promise<
  | { ok: true; document: CertificatePolicyIndividualDocument }
  | { ok: false; code: string; message: string }
> {
  const path = `${CERTIFICATE_POLICY_API_PATH}?scope=individual&counterpartyUserId=${encodeURIComponent(counterpartyUserId)}`;
  try {
    const document = await remcardFetch<CertificatePolicyIndividualDocument>(path);
    return { ok: true, document };
  } catch (caught) {
    const mapped = mapCertificatePolicyError(caught, "Не удалось загрузить условия партнёра.");
    return { ok: false, code: mapped.code, message: mapped.message };
  }
}

function mapCertificatePolicyError(
  caught: unknown,
  fallback: string,
): {
  ok: false;
  code: CertificatePolicyApiErrorCode | "ERROR";
  message: string;
  httpStatus?: number;
  workspace?: CertificatePolicyWorkspace;
} {
  if (caught instanceof RemcardApiError) {
    const body = caught.body as { code?: string; message?: string } | undefined;
    const code = body?.code;
    const message = body?.message ?? caught.message ?? fallback;
    if (code === "NO_OP" || code === "VERSION_CONFLICT" || code === "SELF_APPROVAL") {
      const workspace =
        body && typeof body === "object" && "workspace" in body
          ? ((body as { workspace?: CertificatePolicyWorkspace }).workspace ?? undefined)
          : undefined;
      return {
        ok: false,
        code: code as CertificatePolicyApiErrorCode,
        message,
        httpStatus: caught.status,
        workspace,
      };
    }
    if (caught.status === 403) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message,
        httpStatus: caught.status,
      };
    }
    return {
      ok: false,
      code: "ERROR",
      message,
      httpStatus: caught.status,
    };
  }
  return { ok: false, code: "ERROR", message: fallback };
}