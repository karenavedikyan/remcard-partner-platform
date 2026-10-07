import type { AuthUser } from "@/lib/types";

const SAFE_RETURN_PREFIXES = [
  "/",
  "/scanner",
  "/history",
  "/partners",
  "/profile",
  "/recommendations",
  "/onboarding",
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
  const allowed = SAFE_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? trimmed : null;
}

export function resolvePostLoginPath(user: AuthUser, returnTo: string | null): string {
  if (user.isBlocked) {
    return "/?reason=blocked";
  }
  if (user.role !== "PRO") {
    const onboardingTarget = sanitizeReturnTo(returnTo);
    return onboardingTarget
      ? `/onboarding?returnTo=${encodeURIComponent(onboardingTarget)}`
      : "/onboarding";
  }
  return sanitizeReturnTo(returnTo) ?? "/";
}

export function mapVerifyCodeError(status: number, body: { error?: string; message?: string; retryAfter?: number } | null): string {
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
