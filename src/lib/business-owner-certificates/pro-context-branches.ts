import { RemcardApiError, remcardFetch } from "@/lib/api-client";

export type ProContextBranch = {
  id: string;
  name: string;
  city: string;
  address?: string | null;
};

type ProContextPayload = {
  role: string;
  branches: ProContextBranch[];
};

export type OrgOwnerBranchesResult =
  | { ok: true; branches: ProContextBranch[] }
  | { ok: false; message: string; forbidden?: boolean };

/** GET /api/pro/context — branches the current ORG_OWNER may scope (no PATCH). */
export async function fetchOrgOwnerContextBranches(): Promise<OrgOwnerBranchesResult> {
  try {
    const data = await remcardFetch<ProContextPayload>("/api/pro/context");
    if (data.role !== "ORG_OWNER") {
      return {
        ok: false,
        forbidden: true,
        message: "Список сертификатов доступен только владельцу организации с доступом к филиалу.",
      };
    }
    const branches = data.branches ?? [];
    if (branches.length === 0) {
      return {
        ok: false,
        message: "Нет доступных филиалов для списка сертификатов.",
      };
    }
    return { ok: true, branches };
  } catch (caught) {
    if (caught instanceof RemcardApiError && caught.status === 403) {
      return { ok: false, forbidden: true, message: caught.message || "Доступ запрещён." };
    }
    return {
      ok: false,
      message:
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить контекст филиала.",
    };
  }
}