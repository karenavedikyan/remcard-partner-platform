import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import type { AuthUser } from "@/lib/types";

const SAFE_RETURN_PREFIXES = [
  "/",
  "/scanner",
  "/history",
  "/settlements",
  "/partners",
  "/profile",
  "/recommendations",
  "/invite",
  "/admin",
  "/join",
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
  if (path === "/login" || path.startsWith("/login/") || path.startsWith("/join/")) {
    return null;
  }
  if (path === "/onboarding") {
    if (!trimmed.includes("partnerType=")) {
      return null;
    }
    return trimmed;
  }
  if (path.startsWith("/onboarding/")) {
    return null;
  }
  const allowed = SAFE_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? trimmed : null;
}

export type AuthLoginProvider = "MAX" | "TELEGRAM";

export type AuthFlowStep =
  | "checking_session"
  | "provider"
  | "code"
  | "loading_readiness"
  | "consents"
  | "access_denied"
  | "blocked"
  | "session_retry";

export function resolveStepFromReadiness(
  readiness: CabinetReadiness | null,
  hasSession: boolean,
): AuthFlowStep {
  if (!hasSession) return "provider";
  if (!readiness) return "session_retry";
  if (hasPendingLoginConsents(readiness)) return "consents";
  if (readiness.needsProfileOnboarding) return "loading_readiness";
  if (!readiness.canAccessCabinet) return "access_denied";
  return "loading_readiness";
}

export function isAuthFlowComplete(readiness: CabinetReadiness): boolean {
  return (
    !hasPendingLoginConsents(readiness) &&
    !readiness.needsProfileOnboarding &&
    readiness.canAccessCabinet
  );
}

/** Login consents always precede profile onboarding. */
export type AuthFlowDestination = "complete" | "consents" | "onboarding" | "access_denied";

export function resolveAuthFlowFromReadiness(readiness: CabinetReadiness): AuthFlowDestination {
  if (isAuthFlowComplete(readiness)) return "complete";
  if (hasPendingLoginConsents(readiness)) return "consents";
  if (readiness.needsProfileOnboarding) return "onboarding";
  return "access_denied";
}

export function mapAccessDeniedMessage(readiness: CabinetReadiness): string {
  if (readiness.isAdmin) {
    return "Для входа в кабинет нужен профиль партнёра PRO с принятыми соглашениями. Административный доступ без PRO-профиля недоступен.";
  }
  return "Доступ в кабинет пока недоступен. Проверьте профиль и соглашения или обратитесь в поддержку.";
}

export type ResolveDestinationOptions = {
  /** Agent registration join defers legacy onboarding to /join finish step. */
  registrationAgentJoin?: boolean;
};

/** Ready account in agent join: preserve invite/nested returnTo; plain join → cabinet. */
export function resolveReadyRegistrationAgentJoinDestination(returnTo: string | null): string {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe || safe === "/join") return "/partners";
  if (safe.startsWith("/join?")) {
    const query = safe.includes("?") ? safe.slice(safe.indexOf("?") + 1) : "";
    const params = new URLSearchParams(query);
    const inviteRaw = params.get("invite")?.trim();
    if (inviteRaw && /^[\w-]+$/.test(inviteRaw)) {
      const invitePath = `/invite/${inviteRaw}`;
      if (sanitizeReturnTo(invitePath)) return invitePath;
    }
    const nested = sanitizeReturnTo(params.get("returnTo"));
    if (nested && !nested.startsWith("/join")) return nested;
    return "/partners";
  }
  return safe;
}

export function resolveDestinationAfterAuth(
  readiness: CabinetReadiness,
  returnTo: string | null,
  options?: ResolveDestinationOptions,
): string {
  if (hasPendingLoginConsents(readiness)) {
    const params = new URLSearchParams({ step: "consents" });
    const safe = sanitizeReturnTo(returnTo);
    if (safe) params.set("returnTo", safe);
    return `/login?${params.toString()}`;
  }
  if (readiness.needsProfileOnboarding) {
    const target = sanitizeReturnTo(returnTo);
    if (
      options?.registrationAgentJoin &&
      (target === "/join" || target?.startsWith("/join?"))
    ) {
      return target?.includes("phase=finish") ? target : "/join?phase=finish";
    }
    if (target?.startsWith("/onboarding?") && target.includes("partnerType=")) {
      return target;
    }
    return target
      ? `/onboarding?returnTo=${encodeURIComponent(target)}`
      : "/onboarding";
  }
  if (readiness.canAccessCabinet) {
    const safe = sanitizeReturnTo(returnTo);
    if (options?.registrationAgentJoin) {
      if (!safe || safe === "/join" || safe.startsWith("/join?")) {
        return resolveReadyRegistrationAgentJoinDestination(safe);
      }
      return safe;
    }
    return safe ?? "/";
  }
  return "/?reason=role";
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
    return "Сначала получите код в Telegram- или MAX-боте RemCard.";
  }
  if (status === 403) {
    return "Аккаунт заблокирован.";
  }
  if (status === 503) {
    const code = (body as { code?: string } | null)?.code;
    if (code === "RELEASE_WINDOW_CLOSED") {
      return "Сервис временно недоступен из‑за технического окна обновления. Попробуйте позже.";
    }
    return "Временная ошибка сервера. Попробуйте позже.";
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

/** Re-login link after session loss: pass final destination, not /onboarding wrapper. */
export function buildSessionRecoveryLoginHref(returnTo: string | null | undefined): string {
  const params = new URLSearchParams({ reason: "session" });
  const safe = sanitizeReturnTo(returnTo);
  if (safe) {
    params.set("returnTo", safe);
  }
  return `/login?${params.toString()}`;
}

export function sessionRetryMessage(kind: "network" | "server" | "session_lost"): string {
  if (kind === "network") {
    return "Не удалось связаться с сервером. Проверьте соединение и повторите.";
  }
  if (kind === "session_lost") {
    return "Сессия завершилась. Войдите снова.";
  }
  return "Временная ошибка сервера. Повторите проверку.";
}

export function messengerLoginUrl(
  provider: AuthLoginProvider,
  maxBotUrl: string,
  telegramBotUrl: string,
): string {
  return provider === "MAX" ? maxBotUrl : telegramBotUrl;
}
