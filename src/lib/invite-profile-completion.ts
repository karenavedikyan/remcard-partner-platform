import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import type { PartnerKindUi, PartnerTypeSwitchStateResponse } from "@/lib/partner-kind-ui";
import { profileHrefForIssuerFocus } from "@/lib/recommendation-profile-focus";

const PARTNER_KINDS = new Set<PartnerKindUi>(["agent", "specialist", "store", "company"]);

export type InviteProfileReadiness =
  | { status: "ready"; switchState: PartnerTypeSwitchStateResponse }
  | { status: "needs_setup"; switchState: PartnerTypeSwitchStateResponse }
  | { status: "employee"; switchState: PartnerTypeSwitchStateResponse }
  | { status: "error"; message: string; retriable: boolean };

export type InviteAcceptedContext = "partnership" | "discussion";

/** Safe post-invite navigation targets (returnTo / partners destination). */
export function sanitizeInternalPath(path: string, fallback: string): string {
  return sanitizeReturnTo(path) ?? fallback;
}

/** Auth/session continuation after non-ok POST (may include /login, /onboarding). Not invite returnTo. */
export function sanitizeInviteAuthContinuationPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://") || trimmed.includes("\\")) return null;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  let pathname: string;
  try {
    const resolved = new URL(trimmed, "http://127.0.0.1");
    if (resolved.origin !== "http://127.0.0.1") return null;
    pathname = resolved.pathname;
  } catch {
    return null;
  }
  const allowed =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/join" ||
    pathname.startsWith("/join/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/partners" ||
    pathname.startsWith("/partners/") ||
    pathname === "/";
  if (!allowed) return null;
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    if (!trimmed.includes("partnerType=")) return null;
  }
  return trimmed;
}

export function isStrictPostOk(
  payload: unknown,
): payload is { ok: true; redirect?: string; redirectPath?: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    (payload as { ok: unknown }).ok === true
  );
}

/** Only explicit redirect fields — never error body `returnTo`. */
export function extractAuthContinuationFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  for (const key of ["redirect", "redirectPath"] as const) {
    const value = record[key];
    if (typeof value === "string") {
      const safe = sanitizeInviteAuthContinuationPath(value);
      if (safe) return safe;
    }
  }
  return null;
}

export function extractAuthContinuationRedirect(error: RemcardApiError): string | null {
  return extractAuthContinuationFromPayload(error.body);
}

export function buildInviteProfileCompletionHref(
  returnTo: string,
  context?: InviteAcceptedContext,
): string {
  const safe = sanitizeInternalPath(returnTo, "/partners");
  const base = profileHrefForIssuerFocus(safe, "partnerType");
  if (!context) return base;
  const params = new URLSearchParams(base.split("?")[1] ?? "");
  params.set("inviteAcceptedContext", context);
  return `/profile?${params.toString()}`;
}

export function discussionPartnersHref(discussionId: string): string {
  const id = discussionId.trim();
  if (!id) return "/partners";
  return `/partners?discussion=${encodeURIComponent(id)}`;
}

export function parsePartnerTypeSwitchReadiness(
  switchState: unknown,
): InviteProfileReadiness | null {
  if (!switchState || typeof switchState !== "object") return null;
  const state = switchState as PartnerTypeSwitchStateResponse;
  if (typeof state.isEmployee !== "boolean") return null;

  if (state.isEmployee) {
    if (
      state.currentKind !== null &&
      (typeof state.currentKind !== "string" || !PARTNER_KINDS.has(state.currentKind))
    ) {
      return null;
    }
    return { status: "employee", switchState: state };
  }

  if (
    state.currentKind === null ||
    typeof state.currentKind !== "string" ||
    !PARTNER_KINDS.has(state.currentKind)
  ) {
    return null;
  }

  const recovery = state.setupRecovery;
  if (recovery !== undefined && recovery !== null) {
    if (typeof recovery !== "object" || typeof recovery.needed !== "boolean") {
      return null;
    }
    if (recovery.needed) {
      return { status: "needs_setup", switchState: state };
    }
  }

  return { status: "ready", switchState: state };
}

export async function fetchInviteProfileReadiness(): Promise<InviteProfileReadiness> {
  try {
    const switchState = await remcardFetch<PartnerTypeSwitchStateResponse>(
      "/api/pro/partner-type/switch",
    );
    const parsed = parsePartnerTypeSwitchReadiness(switchState);
    if (!parsed) {
      return {
        status: "error",
        message: "Получен неполный ответ при проверке профиля.",
        retriable: true,
      };
    }
    return parsed;
  } catch (caught) {
    const message =
      caught instanceof RemcardApiError
        ? caught.message
        : "Не удалось проверить данные профиля";
    const retriable = !(caught instanceof RemcardApiError && caught.status === 401);
    return { status: "error", message, retriable };
  }
}

export type InviteProfileRoutePlan =
  | { kind: "destination"; href: string }
  | { kind: "profile_completion"; href: string; returnTo: string };

export function planRouteAfterInviteSuccess(
  readiness: InviteProfileReadiness,
  destination: string,
  context: InviteAcceptedContext,
): InviteProfileRoutePlan {
  const safeDestination = sanitizeInternalPath(destination, "/partners");
  if (readiness.status === "needs_setup") {
    return {
      kind: "profile_completion",
      href: buildInviteProfileCompletionHref(safeDestination, context),
      returnTo: safeDestination,
    };
  }
  return { kind: "destination", href: safeDestination };
}
