/** Trusted admin destinations for platform notification action links. */

const TRUSTED_PATTERNS: RegExp[] = [
  /^https:\/\/prof\.remcard\.ru\/admin\/moderation\/partners\/[\w-]+$/,
  /^https:\/\/remcard\.ru\/admin\/users\/[\w-]+$/,
  /^\/admin\/moderation\/partners\/[\w-]+$/,
];

export function isTrustedAdminNotificationActionUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("javascript:")) return false;
  return TRUSTED_PATTERNS.some((p) => p.test(trimmed));
}

export function adminNotificationActionHref(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  if (!isTrustedAdminNotificationActionUrl(url)) return null;
  return url.trim();
}
