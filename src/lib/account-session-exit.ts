import { getAuthMe, remcardFetch } from "@/lib/api-client";
import { clearRecommendationCreateDraftsForUser } from "@/lib/recommendation-create-draft";

export const ACCOUNT_SESSION_BROADCAST = "remcard-account-session-exit";
export const ACCOUNT_LOGOUT_CURRENT_PATH = "/api/auth/logout";
export const ACCOUNT_LOGOUT_ALL_PATH = "/api/auth/logout-all-sessions";

export type AccountExitScope = "current" | "all";

let pendingExitScope: AccountExitScope | null = null;

export function getAccountExitPending(): AccountExitScope | null {
  return pendingExitScope;
}

export function tryBeginAccountExit(scope: AccountExitScope): boolean {
  if (pendingExitScope) return false;
  pendingExitScope = scope;
  return true;
}

export function endAccountExit(): void {
  pendingExitScope = null;
}

export async function postLogoutCurrentDevice(): Promise<void> {
  await remcardFetch<{ ok: true; scope: AccountExitScope }>(ACCOUNT_LOGOUT_CURRENT_PATH, {
    method: "POST",
    body: {},
    requireCsrf: true,
  });
}

export async function postLogoutAllDevices(): Promise<void> {
  await remcardFetch<{ ok: true; scope: AccountExitScope }>(ACCOUNT_LOGOUT_ALL_PATH, {
    method: "POST",
    body: {},
    requireCsrf: true,
  });
}

export async function clearLocalSessionArtifacts(): Promise<void> {
  const me = await getAuthMe().catch(() => null);
  if (me?.user?.id) clearRecommendationCreateDraftsForUser(me.user.id);
}

export function notifyAccountSessionExit(scope: AccountExitScope): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ACCOUNT_SESSION_BROADCAST,
      JSON.stringify({ scope, at: Date.now() }),
    );
    window.dispatchEvent(new CustomEvent(ACCOUNT_SESSION_BROADCAST, { detail: { scope } }));
  } catch {
    /* ignore */
  }
}
