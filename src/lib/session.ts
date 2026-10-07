import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchRemcardUpstream, getAuthMeServer } from "@/lib/remcard-server";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import type { AuthUser } from "@/lib/types";

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieHeader = headers().get("cookie");
  const auth = await getAuthMeServer(cookieHeader);
  if (!auth.ok || !auth.data.user) {
    return null;
  }
  return auth.data.user;
}

async function getCabinetReadinessServer(): Promise<CabinetReadiness | null> {
  const cookieHeader = headers().get("cookie");
  const result = await fetchRemcardUpstream<CabinetReadiness>("/api/account/cabinet-readiness", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  return result.ok ? result.data : null;
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

  if (readiness.isAdmin) {
    redirect("/?reason=role");
  }

  if (hasPendingLoginConsents(readiness)) {
    loginRedirect(returnTo, "consents");
  }

  if (readiness.needsProfileOnboarding) {
    redirectToOnboarding(returnTo);
  }

  if (!readiness.canAccessCabinet || user.role !== "PRO") {
    redirectToOnboarding(returnTo);
  }

  return user;
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

  if (readiness.isAdmin) {
    redirect("/?reason=role");
  }

  if (hasPendingLoginConsents(readiness)) {
    redirect(`/login?${new URLSearchParams({ step: "consents", returnTo }).toString()}`);
  }

  if (readiness.needsProfileOnboarding || !readiness.canAccessCabinet) {
    redirectToOnboarding(returnTo);
  }

  return user;
}

export async function requireProSession(returnTo?: string): Promise<AuthUser> {
  return ensureCabinetAccess(returnTo ?? "/");
}
