import { getAppUrl } from "@/lib/config";

/** Cabinet routes that may appear as notification deep links (same policy as auth returnTo). */
const ALLOWED_PATH_PREFIXES = [
  "/",
  "/scanner",
  "/history",
  "/settlements",
  "/partners",
  "/profile",
  "/recommendations",
  "/invite",
] as const;

const DEFAULT_TRUSTED_NAVIGATOR_ORIGINS = ["https://remcard.ru", "https://www.remcard.ru"] as const;

const LEGACY_PARTNER_PATH = /^\/(?:pro|store)\/partners(\/.*)?$/;

function normalizeLegacyPartnerPath(pathname: string): string {
  const match = pathname.match(LEGACY_PARTNER_PATH);
  if (!match) return pathname;
  const suffix = match[1] ?? "";
  return `/partners${suffix}`;
}

function isSelfNotificationListPath(pathname: string): boolean {
  return pathname === "/notifications" || pathname.startsWith("/notifications/");
}

function isAllowedCabinetPath(pathname: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`)),
  );
}

function trustedNavigatorOrigins(): Set<string> {
  const origins = new Set<string>(DEFAULT_TRUSTED_NAVIGATOR_ORIGINS);
  try {
    origins.add(new URL(getAppUrl()).origin);
  } catch {
    /* ignore */
  }
  const api = process.env.REMCARD_API_BASE_URL?.trim();
  if (api) {
    try {
      origins.add(new URL(api).origin);
    } catch {
      /* ignore */
    }
  }
  return origins;
}

function parseRelativeCabinetUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return null;
  }
  try {
    return new URL(trimmed, "https://prof.local");
  } catch {
    return null;
  }
}

function parseAbsoluteCabinetUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (!trustedNavigatorOrigins().has(parsed.origin)) {
    return null;
  }
  return parsed;
}

/**
 * Resolve a notification `url` field to a safe in-cabinet relative href, or null when
 * no trustworthy destination exists (hide «Перейти»).
 */
export function resolveProfNotificationTarget(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed =
    trimmed.startsWith("/") && !trimmed.startsWith("//")
      ? parseRelativeCabinetUrl(trimmed)
      : parseAbsoluteCabinetUrl(trimmed);

  if (!parsed) {
    return null;
  }

  const pathname = normalizeLegacyPartnerPath(parsed.pathname);

  if (isSelfNotificationListPath(pathname)) {
    return null;
  }

  if (!isAllowedCabinetPath(pathname)) {
    return null;
  }

  const search = parsed.search ?? "";
  const hash = parsed.hash ?? "";
  return `${pathname}${search}${hash}`;
}
