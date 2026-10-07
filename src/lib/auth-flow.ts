import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import type { AuthUser } from "@/lib/types";

const SAFE_RETURN_PREFIXES = [
  "/",
  "/scanner",
  "/history",
  "/partners",
  "/profile",
  "/recommendations",
] as const;

/** Allow only same-origin relative paths without protocol tricks. */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return null;
  }
  const path = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (path === "/login" || path.startsWith("/login/") || path === "/onboarding") {
    return null;
  }
  const allowed = SAFE_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? trimmed : null;
}

export type AuthFlowStep = "code" | "consents" | "done";

export function resolveStepFromReadiness(
  readiness: CabinetReadiness | null,
  hasSession: boolean,
): AuthFlowStep {
  if (!hasSession) return "code";
  if (!readiness) return "consents";
  if (hasPendingLoginConsents(readiness)) return "consents";
  return "done";
}

export function resolveDestinationAfterAuth(
  readiness: CabinetReadiness,
  returnTo: string | null,
): string {
  if (readiness.isAdmin) {
    return "/?reason=role";
  }
  if (readiness.needsProfileOnboarding) {
    const target = sanitizeReturnTo(returnTo);
    return target
      ? `/onboarding?returnTo=${encodeURIComponent(target)}`
      : "/onboarding";
  }
  if (!readiness.canAccessCabinet) {
    return "/login";
  }
  return sanitizeReturnTo(returnTo) ?? "/";
}

export function mapVerifyCodeError(
  status: number,
  body: { error?: string; message?: string; retryAfter?: number } | null,
): string {
  if (status === 429) {
    const retry = body?.retryAfter;
    if (typeof retry === "number" && retry > 0) {
      return `Слишком много попыток. Повторите через ${retry} сек.`;
    }
    return "Слишком много попыток. Подождите и повторите.";
  }
  if (status === 401) {
    return "Неверный или просроченный код. Запросите новый в боте.";
  }
  if (status === 404) {
    return "Сначала получите код в Telegram-боте RemCard.";
  }
  if (status === 403) {
    return "Аккаунт заблокирован.";
  }
  if (status === 0) {
    return "Не удалось связаться с сервером. Проверьте соединение.";
  }
  if (status >= 500) {
    return "Временная ошибка сервера. Попробуйте позже.";
  }
  return body?.error ?? body?.message ?? "Не удалось выполнить вход.";
}

export function mapPostLoginBlocked(user: AuthUser | null): string | null {
  if (!user) return "Сессия не подтверждена. Продолжите со следующего шага.";
  if (user.isBlocked) return "Аккаунт заблокирован.";
  return null;
}
