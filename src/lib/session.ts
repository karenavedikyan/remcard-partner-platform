import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthMeServer } from "@/lib/remcard-server";
import type { AuthUser } from "@/lib/types";

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieHeader = headers().get("cookie");
  const auth = await getAuthMeServer(cookieHeader);
  if (!auth.ok || !auth.data.user) {
    return null;
  }
  return auth.data.user;
}

export function redirectToOnboarding(returnTo: string): never {
  redirect(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
}

/** Gate for server pages: null = show login gate; never returns for CLIENT (redirects). */
export async function requireProPageUser(returnTo: string): Promise<AuthUser | null> {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  if (user.isBlocked) {
    redirect("/?reason=blocked");
  }
  if (user.role !== "PRO") {
    redirectToOnboarding(returnTo);
  }
  return user;
}

export async function requireProSession(returnTo?: string): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    const query = new URLSearchParams({ reason: "session" });
    if (returnTo) {
      query.set("returnTo", returnTo);
    }
    redirect(`/login?${query.toString()}`);
  }
  if (user.isBlocked) {
    redirect("/?reason=blocked");
  }
  if (user.role !== "PRO") {
    const query = new URLSearchParams();
    if (returnTo) {
      query.set("returnTo", returnTo);
    }
    redirect(`/onboarding${query.size ? `?${query.toString()}` : ""}`);
  }
  return user;
}
