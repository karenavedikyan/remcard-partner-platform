import { appConfig, isBackendConfigured, requireBackendBaseUrl } from "./config";
import {
  applyUpstreamAuthHeaders,
  assertBackendUrlWithoutCredentials,
} from "./remcard-upstream-auth";
import { parseStoreOrderIdempotencyKey } from "./store-order-idempotency-key";
import {
  branchByIdPath,
  branchEmployeeByIdPath,
  branchEmployeeTransferPath,
  branchSubPath,
  inviteByIdPath,
  proEmployeeByIdPath,
} from "./remcard-proxy-ids";

export const UPSTREAM_TIMEOUT_MS = 15_000;

const SESSION_COOKIE = "remcard-token";
const ALLOWED_COOKIE_NAMES = new Set([SESSION_COOKIE]);
const UNSAFE_LOCATION_CHARS = /[\u0000-\u001F\u007F\\]/;
const ENCODED_CONTROL_CHARS = /%(?:0[0-9a-fA-F]|1[0-9a-fA-F]|7[Ff])/;

const ALLOWED_ROUTES: ReadonlyArray<{ methods: ReadonlySet<string>; pattern: RegExp }> =
  [
    { methods: new Set(["GET", "PATCH"]), pattern: /^\/api\/auth\/me$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/auth\/logout$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/auth\/verify-code$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/account\/consent$/ },
    { methods: new Set(["GET"]), pattern: /^\/api\/account\/cabinet-readiness$/ },
    { methods: new Set(["GET", "PATCH"]), pattern: /^\/api\/pro\/profile$/ },
    { methods: new Set(["GET"]), pattern: /^\/api\/pro\/partner-taxonomy$/ },
    { methods: new Set(["GET", "POST", "PATCH"]), pattern: /^\/api\/pro\/organization$/ },
    { methods: new Set(["GET"]), pattern: /^\/api\/pro\/moderation-notes$/ },
    {
      methods: new Set(["GET", "PATCH"]),
      pattern: /^\/api\/pro\/notification-settings$/,
    },
    { methods: new Set(["POST"]), pattern: /^\/api\/pro\/notification-settings\/test$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/pro\/notification-bind\/start$/ },
    { methods: new Set(["GET"]), pattern: /^\/api\/pro\/notification-bind\/status$/ },
    { methods: new Set(["GET", "POST", "PATCH"]), pattern: /^\/api\/pro\/organization\/branches$/ },
    { methods: new Set(["GET", "PATCH"]), pattern: branchByIdPath() },
    { methods: new Set(["GET"]), pattern: /^\/api\/pro\/organization\/employees-overview$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/pro\/organization\/submit-for-moderation$/ },
    { methods: new Set(["POST"]), pattern: branchSubPath("/submit-for-moderation") },
    { methods: new Set(["GET", "PATCH"]), pattern: branchSubPath("/public-contacts") },
    { methods: new Set(["GET", "POST"]), pattern: branchSubPath("/employees") },
    { methods: new Set(["PATCH", "DELETE"]), pattern: branchEmployeeByIdPath() },
    { methods: new Set(["POST"]), pattern: branchEmployeeTransferPath() },
    { methods: new Set(["GET", "POST"]), pattern: /^\/api\/pro\/invites$/ },
    { methods: new Set(["DELETE", "PATCH"]), pattern: inviteByIdPath() },
    { methods: new Set(["GET"]), pattern: /^\/api\/pro\/employees$/ },
    { methods: new Set(["PATCH", "DELETE"]), pattern: proEmployeeByIdPath() },
    { methods: new Set(["GET"]), pattern: /^\/api\/invite\/[\w-]+$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/invite\/accept$/ },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/partnership\/(list|search|incoming-count)$/,
    },
    { methods: new Set(["POST"]), pattern: /^\/api\/partnership\/(invite|remind)$/ },
    { methods: new Set(["GET", "POST"]), pattern: /^\/api\/partnership\/link-invite$/ },
    { methods: new Set(["DELETE"]), pattern: /^\/api\/partnership\/link-invite\/[\w-]+$/ },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/partnership\/link-invite\/public\/[\w-]+$/,
    },
    { methods: new Set(["POST"]), pattern: /^\/api\/partnership\/link-invite\/accept$/ },
    { methods: new Set(["PATCH"]), pattern: /^\/api\/partnership\/[\w-]+$/ },
    {
      methods: new Set(["GET", "POST"]),
      pattern: /^\/api\/partnerships\/[\w-]+\/term-change$/,
    },
    {
      methods: new Set(["POST"]),
      pattern: /^\/api\/partnerships\/[\w-]+\/term-change\/[\w-]+\/respond$/,
    },
    {
      methods: new Set(["GET", "POST"]),
      pattern: /^\/api\/store\/certificate$/,
    },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/store\/certificate\/available-partners$/,
    },
    {
      methods: new Set(["GET"]),
      // Certificate id (cuid); reserved subpaths like /issue are not allowlisted.
      pattern: /^\/api\/store\/certificate\/c[a-z0-9]{20,}$/i,
    },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/certificate\/[\w-]+\/pdf$/,
    },
    { methods: new Set(["GET"]), pattern: /^\/api\/certificate\/[\w-]+$/ },
    {
      methods: new Set(["POST"]),
      pattern: /^\/api\/store\/order(?:\/preview)?$/,
    },
    { methods: new Set(["GET"]), pattern: /^\/api\/store\/bonus-list$/ },
    { methods: new Set(["GET"]), pattern: /^\/api\/store\/orders$/ },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/store\/orders\/c[a-z0-9]{20,}$/i,
    },
    { methods: new Set(["GET"]), pattern: /^\/api\/pro\/orders$/ },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/pro\/orders\/c[a-z0-9]{20,}$/i,
    },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/pro\/wallet\/(balance|transactions|settlements)$/,
    },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/bonus\/(balance|history)$/,
    },
  ];

export type ProxyRequestInput = {
  method: string;
  pathname: string;
  search: string;
  contentType: string | null;
  cookieHeader: string | null;
  origin: string | null;
  bodyText?: string;
  /** Raw Idempotency-Key from client — validated and forwarded only for POST /api/store/order. */
  idempotencyKeyHeader?: string | null;
};

export type ProxyResponseResult =
  | {
      ok: true;
      status: number;
      body: ArrayBuffer | null;
      contentType: string | null;
      setCookies: string[];
      location: string | null;
      idempotentReplayed: string | null;
    }
  | { ok: false; status: number; body: string };

const STORE_ORDER_PATH = "/api/store/order";

export function resolveStoreOrderIdempotencyKey(
  method: string,
  pathname: string,
  rawHeader: string | null | undefined,
): { ok: true; key: string | null } | { ok: false; status: number; body: string } {
  if (method.toUpperCase() !== "POST" || pathname !== STORE_ORDER_PATH) {
    return { ok: true, key: null };
  }

  const parsed = parseStoreOrderIdempotencyKey(rawHeader);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 400,
      body: JSON.stringify({ error: parsed.error }),
    };
  }

  return { ok: true, key: parsed.key };
}

export function normalizeProxyPath(pathSegments: string[]): string | null {
  try {
    const decoded = pathSegments.map((segment) => decodeURIComponent(segment));
    if (
      decoded.some(
        (segment) =>
          segment === ".." ||
          segment === "." ||
          segment.includes("\\") ||
          segment.includes("/"),
      )
    ) {
      return null;
    }
    return `/${decoded.join("/")}`;
  } catch {
    return null;
  }
}

export function isAllowedProxyRoute(method: string, pathname: string): boolean {
  const upperMethod = method.toUpperCase();
  return ALLOWED_ROUTES.some(
    (route) => route.methods.has(upperMethod) && route.pattern.test(pathname),
  );
}

export function getCookieHeaderName(cookiePart: string): string | null {
  const trimmed = cookiePart.trim();
  if (!trimmed) {
    return null;
  }

  const separator = trimmed.indexOf("=");
  const rawName = separator === -1 ? trimmed : trimmed.slice(0, separator);
  const name = rawName.trim();
  return name || null;
}

export function filterAllowedCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const filtered = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const name = getCookieHeaderName(part);
      return Boolean(name && ALLOWED_COOKIE_NAMES.has(name));
    });

  return filtered.length > 0 ? filtered.join("; ") : null;
}

export function filterAllowedSetCookies(setCookies: readonly string[]): string[] {
  return setCookies.filter((cookie) => {
    const firstSegment = cookie.split(";")[0] ?? "";
    const name = getCookieHeaderName(firstSegment);
    return Boolean(name && ALLOWED_COOKIE_NAMES.has(name));
  });
}

export function isAllowedMutatingOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }
  return origin === appConfig.appUrl;
}

export function responseMustNotIncludeBody(status: number, method: string): boolean {
  const upperMethod = method.toUpperCase();
  return (
    upperMethod === "HEAD" || status === 204 || status === 205 || status === 304
  );
}

function containsUnsafeLocationContent(value: string): boolean {
  if (UNSAFE_LOCATION_CHARS.test(value) || ENCODED_CONTROL_CHARS.test(value)) {
    return true;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value && UNSAFE_LOCATION_CHARS.test(decoded)) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

function getTrustedProxyOrigins(backendBaseUrl: string): Set<string> {
  const origins = new Set<string>();

  try {
    origins.add(new URL(assertBackendUrlWithoutCredentials(backendBaseUrl)).origin);
  } catch {
    return origins;
  }

  try {
    origins.add(new URL(appConfig.appUrl).origin);
  } catch {
    // Ignore invalid app URL; backend origin remains enforced.
  }

  return origins;
}

export function validateProxyLocation(
  location: string | null,
  backendBaseUrl: string,
): string | null {
  if (!location) {
    return null;
  }

  const trimmed = location.trim();
  if (!trimmed) {
    return null;
  }

  if (containsUnsafeLocationContent(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  const trustedOrigins = getTrustedProxyOrigins(backendBaseUrl);
  if (trustedOrigins.size === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = trimmed.startsWith("/")
      ? new URL(trimmed, assertBackendUrlWithoutCredentials(backendBaseUrl))
      : new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  if (!trustedOrigins.has(parsed.origin)) {
    return null;
  }

  const normalizedTarget = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (containsUnsafeLocationContent(normalizedTarget)) {
    return null;
  }

  if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
    return null;
  }

  const serialized = trimmed.startsWith("/")
    ? normalizedTarget
    : `${parsed.origin}${normalizedTarget}`;

  if (serialized.startsWith("//")) {
    return null;
  }

  for (const trustedOrigin of Array.from(trustedOrigins)) {
    try {
      const resolved = serialized.startsWith("/")
        ? new URL(serialized, trustedOrigin)
        : new URL(serialized);

      if (!trustedOrigins.has(resolved.origin)) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return serialized;
}

export async function proxyRemcardRequest(
  input: ProxyRequestInput,
): Promise<ProxyResponseResult> {
  const pathname = input.pathname;

  if (!isBackendConfigured()) {
    return {
      ok: false,
      status: 503,
      body: JSON.stringify({ error: "Test backend is not configured" }),
    };
  }

  if (!isAllowedProxyRoute(input.method, pathname)) {
    return { ok: false, status: 403, body: JSON.stringify({ error: "Path not allowed" }) };
  }

  const idempotency = resolveStoreOrderIdempotencyKey(
    input.method,
    pathname,
    input.idempotencyKeyHeader,
  );
  if (!idempotency.ok) {
    return idempotency;
  }

  const upperMethod = input.method.toUpperCase();
  if (
    upperMethod !== "GET" &&
    upperMethod !== "HEAD" &&
    !isAllowedMutatingOrigin(input.origin)
  ) {
    return { ok: false, status: 403, body: JSON.stringify({ error: "Origin not allowed" }) };
  }

  // This cabinet has a version-aware UI. Never silently fall back to the
  // backend's optional-document legacy path used by the existing main site.
  if (upperMethod === "POST" && pathname === "/api/account/consent") {
    let payload: unknown;
    try {
      payload = JSON.parse(input.bodyText ?? "");
    } catch {
      return { ok: false, status: 400, body: JSON.stringify({ error: "INVALID_CONSENT_BODY" }) };
    }
    const documentId = payload && typeof payload === "object"
      ? (payload as { legalDocumentId?: unknown }).legalDocumentId : undefined;
    if (typeof documentId !== "string" || !documentId.trim()) {
      return { ok: false, status: 400, body: JSON.stringify({ error: "LEGAL_DOCUMENT_ID_REQUIRED" }) };
    }
  }

  let backendBaseUrl: string;
  try {
    backendBaseUrl = assertBackendUrlWithoutCredentials(requireBackendBaseUrl());
  } catch (error) {
    return {
      ok: false,
      status: 503,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Invalid backend URL",
      }),
    };
  }

  const targetUrl = new URL(pathname, backendBaseUrl);
  targetUrl.search = input.search;

  const headers = new Headers();
  if (input.contentType) {
    headers.set("content-type", input.contentType);
  }

  const cookie = filterAllowedCookies(input.cookieHeader);
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const auth = applyUpstreamAuthHeaders(headers);
  if (!auth.ok) {
    return { ok: false, status: 503, body: JSON.stringify({ error: auth.message }) };
  }

  if (idempotency.key) {
    headers.set("Idempotency-Key", idempotency.key);
  }

  const init: RequestInit = {
    method: upperMethod,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  };

  if (upperMethod !== "GET" && upperMethod !== "HEAD" && input.bodyText !== undefined) {
    init.body = input.bodyText;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Upstream timeout"
        : "Upstream request failed";
    return { ok: false, status: 504, body: JSON.stringify({ error: message }) };
  }

  const body = responseMustNotIncludeBody(upstream.status, upperMethod)
    ? null
    : await upstream.arrayBuffer();

  const rawSetCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")!]
        : [];

  const location = validateProxyLocation(upstream.headers.get("location"), backendBaseUrl);

  return {
    ok: true,
    status: upstream.status,
    body,
    contentType: upstream.headers.get("content-type"),
    setCookies: filterAllowedSetCookies(rawSetCookies),
    location,
    idempotentReplayed: upstream.headers.get("Idempotent-Replayed"),
  };
}

export function buildProxyNextResponse(result: ProxyResponseResult): Response {
  if (!result.ok) {
    return new Response(result.body, {
      status: result.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  const headers = new Headers();
  if (result.contentType) {
    headers.set("content-type", result.contentType);
  }
  headers.set("cache-control", "no-store");

  if (result.location) {
    headers.set("location", result.location);
  }

  if (result.idempotentReplayed) {
    headers.set("Idempotent-Replayed", result.idempotentReplayed);
  }

  for (const cookie of filterAllowedSetCookies(result.setCookies)) {
    headers.append("set-cookie", cookie);
  }

  return new Response(result.body, {
    status: result.status,
    headers,
  });
}
