import { appConfig, isBackendConfigured, requireBackendBaseUrl } from "./config";
import {
  applyUpstreamAuthHeaders,
  assertBackendUrlWithoutCredentials,
} from "./remcard-upstream-auth";

export const UPSTREAM_TIMEOUT_MS = 15_000;

const SESSION_COOKIE = "remcard-token";
const ALLOWED_COOKIE_NAMES = new Set([SESSION_COOKIE]);

const ALLOWED_ROUTES: ReadonlyArray<{ methods: ReadonlySet<string>; pattern: RegExp }> =
  [
    { methods: new Set(["GET"]), pattern: /^\/api\/auth\/me$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/auth\/logout$/ },
    { methods: new Set(["GET", "PATCH"]), pattern: /^\/api\/pro\/profile$/ },
    {
      methods: new Set(["GET"]),
      pattern: /^\/api\/partnership\/(list|search)$/,
    },
    { methods: new Set(["POST"]), pattern: /^\/api\/partnership\/invite$/ },
    {
      methods: new Set(["GET", "POST"]),
      pattern: /^\/api\/store\/certificate$/,
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
};

export type ProxyResponseResult =
  | {
      ok: true;
      status: number;
      body: ArrayBuffer | null;
      contentType: string | null;
      setCookies: string[];
      location: string | null;
    }
  | { ok: false; status: number; body: string };

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

export function filterAllowedCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const filtered = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const name = part.split("=")[0]?.trim();
      return Boolean(name && ALLOWED_COOKIE_NAMES.has(name));
    });

  return filtered.length > 0 ? filtered.join("; ") : null;
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

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const backendOrigin = new URL(assertBackendUrlWithoutCredentials(backendBaseUrl)).origin;
  if (parsed.origin === backendOrigin) {
    return trimmed;
  }

  return null;
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

  const upperMethod = input.method.toUpperCase();
  if (
    upperMethod !== "GET" &&
    upperMethod !== "HEAD" &&
    !isAllowedMutatingOrigin(input.origin)
  ) {
    return { ok: false, status: 403, body: JSON.stringify({ error: "Origin not allowed" }) };
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

  const setCookies =
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
    setCookies,
    location,
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

  for (const cookie of result.setCookies) {
    headers.append("set-cookie", cookie);
  }

  return new Response(result.body, {
    status: result.status,
    headers,
  });
}
