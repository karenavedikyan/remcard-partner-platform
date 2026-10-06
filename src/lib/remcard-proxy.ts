import { appConfig, isBackendConfigured, requireBackendBaseUrl } from "./config";

export const UPSTREAM_TIMEOUT_MS = 15_000;

const ALLOWED_COOKIE_NAMES = new Set(["remcard-token"]);

const ALLOWED_ROUTES: ReadonlyArray<{ methods: ReadonlySet<string>; pattern: RegExp }> =
  [
    { methods: new Set(["GET"]), pattern: /^\/api\/auth\/me$/ },
    { methods: new Set(["POST"]), pattern: /^\/api\/auth\/logout$/ },
    {
      methods: new Set(["GET", "POST"]),
      pattern: /^\/api\/auth\/[\w-]+$/,
    },
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
      body: ArrayBuffer;
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
    return true;
  }
  return origin === appConfig.appUrl;
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

  const targetUrl = new URL(pathname, requireBackendBaseUrl());
  targetUrl.search = input.search;

  const headers = new Headers();
  if (input.contentType) {
    headers.set("content-type", input.contentType);
  }

  const cookie = filterAllowedCookies(input.cookieHeader);
  if (cookie) {
    headers.set("cookie", cookie);
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

  const body =
    upperMethod === "HEAD" || upstream.status === 204 || upstream.status === 304
      ? new ArrayBuffer(0)
      : await upstream.arrayBuffer();

  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")!]
        : [];

  return {
    ok: true,
    status: upstream.status,
    body,
    contentType: upstream.headers.get("content-type"),
    setCookies,
    location: upstream.headers.get("location"),
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
