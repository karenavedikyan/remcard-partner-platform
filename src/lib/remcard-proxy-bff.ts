import type { NextRequest } from "next/server";
import {
  normalizeProxyPath,
  readProxyRequestBody,
  type ProxyRequestInput,
} from "@/lib/remcard-proxy";

/** POST bonus payout — same id segment shape as proxy allowlist / upstream BONUS_PAY_PATH. */
const BONUS_PAY_PROXY_PATH = /^\/api\/bonus\/[^/]+\/pay$/;

const MINI_APP_CERTIFICATE_PATH = "/api/pro/mini-app/certificate";

function readProxyIdempotencyKey(request: NextRequest, pathname: string): string | null {
  if (request.method !== "POST") {
    return null;
  }
  const idem =
    request.headers.get("Idempotency-Key") ??
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key");

  if (pathname === "/api/store/order") {
    return request.headers.get("Idempotency-Key");
  }
  if (
    pathname === "/api/pro/agent-certificates" ||
    BONUS_PAY_PROXY_PATH.test(pathname) ||
    /^\/api\/pro\/wallet\/order-rewards\/c[a-z0-9]{20,}$/i.test(pathname)
  ) {
    return request.headers.get("Idempotency-Key");
  }
  if (pathname === MINI_APP_CERTIFICATE_PATH) {
    return idem;
  }
  if (
    pathname === "/api/store/certificate" &&
    request.headers.get("x-remcard-mini-app-certificate-create") === "1"
  ) {
    return idem;
  }
  return null;
}

function readMiniAppPlatformHeader(request: NextRequest, pathname: string): string | null {
  const raw = request.headers.get("x-remcard-mini-app-platform");
  if (!raw?.trim()) {
    return null;
  }
  if (pathname.startsWith("/api/pro/mini-app/")) {
    return raw.trim();
  }
  if (
    pathname === "/api/store/certificate" &&
    request.headers.get("x-remcard-mini-app-certificate-create") === "1"
  ) {
    return raw.trim();
  }
  return null;
}

export async function buildRemcardProxyRequestInput(
  request: NextRequest,
  pathSegments: string[],
): Promise<ProxyRequestInput | null> {
  const pathname = normalizeProxyPath(pathSegments);
  if (!pathname) {
    return null;
  }

  const contentType = request.headers.get("content-type");
  const { bodyText, bodyBinary } = await readProxyRequestBody(
    request.method,
    contentType,
    request,
  );

  const miniCreate = request.headers.get("x-remcard-mini-app-certificate-create");

  return {
    method: request.method,
    pathname,
    search: request.nextUrl.search,
    contentType,
    cookieHeader: request.headers.get("cookie"),
    origin: request.headers.get("origin"),
    csrfHeader: request.headers.get("X-CSRF-Token"),
    bodyText,
    bodyBinary,
    idempotencyKeyHeader: readProxyIdempotencyKey(request, pathname),
    miniAppPlatformHeader: readMiniAppPlatformHeader(request, pathname),
    miniAppCertificateCreateHeader: miniCreate,
  };
}