import { RemcardApiError } from "@/lib/api-client";

export type MiniWalletFailure = "branch_denied" | "branch_required" | "forbidden" | "session_expired" | "error";

export function classifyMiniWalletFailure(error: unknown): MiniWalletFailure {
  if (!(error instanceof RemcardApiError)) return "error";
  if (error.status === 401) return "session_expired";
  if ((error.status === 403 || error.status === 400) && error.body?.code === "BRANCH_FORBIDDEN") {
    return "branch_denied";
  }
  if (error.status === 400 && error.body?.code === "BRANCH_REQUIRED") return "branch_required";
  if (error.status === 403 && ["WALLET_FORBIDDEN", "PROF_ACCESS_DENIED"].includes(error.body?.code ?? "")) {
    return "forbidden";
  }
  return "error";
}

export const miniWalletFailureMessage: Record<MiniWalletFailure, string> = {
  branch_denied: "Нет доступа к расчётам выбранного филиала.",
  branch_required: "Выберите рабочую точку, чтобы показать её баланс.",
  forbidden: "Нет права на просмотр кошелька.",
  session_expired: "Сессия истекла. Откройте мини-кабинет заново.",
  error: "Не удалось загрузить кошелёк. Попробуйте ещё раз.",
};
