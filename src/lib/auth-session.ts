import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness, ConsentRequirement } from "@/lib/cabinet-readiness";
import type { AuthMeResponse } from "@/lib/types";

export type SessionFetchKind = "unauthorized" | "network" | "server" | "blocked";

export type SessionFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: SessionFetchKind; status?: number; message?: string };

function classifyError(error: unknown): SessionFetchResult<never> {
  if (error instanceof RemcardApiError) {
    if (error.status === 401) {
      return { ok: false, kind: "unauthorized" };
    }
    if (error.status === 403) {
      return { ok: false, kind: "blocked", status: 403, message: error.message };
    }
    if (error.status === 0) {
      return { ok: false, kind: "network", status: 0, message: error.message };
    }
    if (error.status >= 500) {
      return { ok: false, kind: "server", status: error.status, message: error.message };
    }
    return { ok: false, kind: "server", status: error.status, message: error.message };
  }
  return { ok: false, kind: "network", message: "Сетевая ошибка" };
}

export async function fetchAuthMeSafe(): Promise<SessionFetchResult<AuthMeResponse>> {
  try {
    const data = await getAuthMe();
    if (!data.user) {
      return { ok: false, kind: "unauthorized" };
    }
    if (data.user.isBlocked) {
      return { ok: false, kind: "blocked", message: "Аккаунт заблокирован." };
    }
    return { ok: true, data };
  } catch (error) {
    return classifyError(error);
  }
}

export async function fetchReadinessSafe(): Promise<SessionFetchResult<CabinetReadiness>> {
  try {
    const data = await remcardFetch<CabinetReadiness>("/api/account/cabinet-readiness");
    return { ok: true, data };
  } catch (error) {
    return classifyError(error);
  }
}

export function consentRequirementKey(req: ConsentRequirement): string {
  return `${req.kind}:${req.legalDocumentId ?? ""}`;
}
