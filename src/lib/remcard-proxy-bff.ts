import type { NextRequest } from "next/server";
import {
  normalizeProxyPath,
  readProxyRequestBody,
  type ProxyRequestInput,
} from "@/lib/remcard-proxy";

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
    idempotencyKeyHeader:
      request.method === "POST" &&
      (pathname === "/api/store/order" || pathname === "/api/pro/agent-certificates" ||
        /^\/api\/pro\/wallet\/order-rewards\/c[a-z0-9]{20,}$/i.test(pathname))
        ? request.headers.get("Idempotency-Key")
        : null,
  };
}
