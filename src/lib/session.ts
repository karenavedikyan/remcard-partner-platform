import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuthMeServerCached,
  getCabinetReadinessServerCached,
} from "@/lib/cabinet-upstream-cache";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import type { AuthUser } from "@/lib/types";

async function getRequestCookieKey(): Promise<string> {
  return (await headers()).get("cookie") ?? "";
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieKey = await getRequestCookieKey();
  const auth = await getAuthMeServerCached(cookieKey);
  if (!auth.ok || !auth.data.user) {
    return null;
  }
  return auth.data.user;
}

async function getCabinetReadinessServer(): Promise<CabinetReadiness | null> {
  const cookieKey = await getRequestCookieKey();
  return getCabinetReadinessServerCached(cookieKey);
}

function loginRedirect(returnTo: string, step?: "consents"): never {
  const query = new URLSearchParams({ reason: "session", returnTo });
  if (step) {
    query.set("step", step);
  }
  redirect(`/login?${query.toString()}`);
}

export function redirectToOnboarding(returnTo: string): never {
  redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
}

function isProfCabinetAllowed(readiness: CabinetReadiness, user: AuthUser): boolean {
  if (user.isBlocked) return false;
  if (hasPendingLoginConsents(readiness)) return false;
  if (readiness.needsProfileOnboarding) return false;
  if (!readiness.canAccessCabinet) return false;
  return user.role === "PRO" || readiness.isEmployee;
}

async function ensureCabinetAccess(returnTo: string): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    loginRedirect(returnTo);
  }
  if (user.isBlocked) {
    redirect("/?reason=blocked");
  }

  const readiness = await getCabinetReadinessServer();
  if (!readiness) {
    loginRedirect(returnTo);
  }

  if (isProfCabinetAllowed(readiness, user)) {
    return user;
  }

  if (hasPendingLoginConsents(readiness)) {
    loginRedirect(returnTo, "consents");
  }

  if (readiness.needsProfileOnboarding) {
    redirectToOnboarding(returnTo);
  }

  if (readiness.isAdmin) {
    redirect("/?reason=role");
  }

  redirect("/?reason=role");
}

/** Gate for server pages: null = show login gate (no session only). */
export async function requireProPageUser(returnTo: string): Promise<AuthUser | null> {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  if (user.isBlocked) {
    redirect("/?reason=blocked");
  }

  const readiness = await getCabinetReadinessServer();
  if (!readiness) {
    return null;
  }

  if (isProfCabinetAllowed(readiness, user)) {
    return user;
  }

  if (hasPendingLoginConsents(readiness)) {
    redirect(`/login?${new URLSearchParams({ step: "consents", returnTo }).toString()}`);
  }

  if (readiness.needsProfileOnboarding) {
    redirectToOnboarding(returnTo);
  }

  if (readiness.isAdmin) {
    redirect("/?reason=role");
  }

  redirect("/?reason=role");
}

export async function requireProSession(returnTo?: string): Promise<AuthUser> {
  return ensureCabinetAccess(returnTo ?? "/");
}

/** Non-redirecting cabinet peek for persistent layout (same allow rules as isProfCabinetAllowed). */
export async function peekCabinetSession(): Promise<AuthUser | null> {
  const user = await getSessionUser();
  if (!user || user.isBlocked) {
    return null;
  }
  const readiness = await getCabinetReadinessServer();
  if (!readiness) {
    return null;
  }
  if (!isProfCabinetAllowed(readiness, user)) {
    return null;
  }
  return user;
}
