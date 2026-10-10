import { getAppUrl } from "@/lib/config";

const DEFAULT_TRUSTED_NAVIGATOR_ORIGINS = ["https://remcard.ru", "https://www.remcard.ru"] as const;

/** Static App Router pages on the partner cabinet (no arbitrary subpaths). */
const EXACT_STATIC_PATHS = new Set([
  "/",
  "/scanner",
  "/history",
  "/settlements",
  "/partners",
  "/profile",
  "/recommendations",
  "/recommendations/new",
  "/invite/accept",
]);

const DEV_FIXTURE_SEGMENT = "dev-fixture";

const PATH_SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Legacy navigator partner list URLs — exact paths only (optional trailing slash).
 * Any suffix such as /pro/partners/foo is rejected (null).
 */
function mapLegacyPartnerPathname(pathname: string): string | null {
  const path = stripTrailingSlash(pathname);
  if (path === "/pro/partners" || path === "/store/partners") {
    return "/partners";
  }
  if (/^\/(?:pro|store)\/partners\//.test(path)) {
    return null;
  }
  return pathname;
}

function isSelfNotificationListPath(pathname: string): boolean {
  return pathname === "/notifications" || pathname.startsWith("/notifications/");
}

function hasDevFixture(pathname: string): boolean {
  return pathname.split("/").includes(DEV_FIXTURE_SEGMENT);
}

function isAllowedCabinetPath(pathname: string): boolean {
  const path = stripTrailingSlash(pathname);

  if (hasDevFixture(path)) {
    return false;
  }

  if (EXACT_STATIC_PATHS.has(path)) {
    return true;
  }

  const parts = path.split("/").filter(Boolean);

  if (parts.length === 3 && parts[0] === "history" && parts[1] === "accruals" && PATH_SEGMENT.test(parts[2]!)) {
    return true;
  }
  if (parts.length === 3 && parts[0] === "history" && parts[1] === "purchases" && PATH_SEGMENT.test(parts[2]!)) {
    return true;
  }
  if (parts.length === 2 && parts[0] === "recommendations" && PATH_SEGMENT.test(parts[1]!)) {
    return parts[1] !== "new";
  }
  if (parts.length === 2 && parts[0] === "invite" && PATH_SEGMENT.test(parts[1]!)) {
    return parts[1] !== "accept";
  }

  return false;
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

  const legacyMapped = mapLegacyPartnerPathname(parsed.pathname);
  if (legacyMapped === null) {
    return null;
  }
  const pathname = legacyMapped;

  if (isSelfNotificationListPath(pathname)) {
    return null;
  }

  if (!isAllowedCabinetPath(pathname)) {
    return null;
  }

  const search = parsed.search ?? "";
  const hash = parsed.hash ?? "";
  const normalizedPath = stripTrailingSlash(pathname);
  return `${normalizedPath}${search}${hash}`;
}
