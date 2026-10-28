/** Trusted messenger deeplink hosts for admin notification binding (not arbitrary URLs). */

export function isTrustedAdminNotificationBindDeepLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || /^\s*javascript:/i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "t.me" || host === "telegram.me") return true;
    if (host === "max.ru" || host.endsWith(".max.ru")) return true;
    return false;
  } catch {
    return false;
  }
}

export type OpenTrustedBindLinkResult = "opened" | "popup_blocked" | "invalid";

export function openTrustedAdminNotificationBindDeepLink(url: string): OpenTrustedBindLinkResult {
  if (!isTrustedAdminNotificationBindDeepLink(url)) return "invalid";
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  return popup ? "opened" : "popup_blocked";
}
