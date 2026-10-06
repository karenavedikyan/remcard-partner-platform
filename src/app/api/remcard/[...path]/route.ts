import { NextRequest } from "next/server";
import { assertServerOnly } from "@/lib/config";
import {
  buildProxyNextResponse,
  normalizeProxyPath,
  proxyRemcardRequest,
} from "@/lib/remcard-proxy";

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  assertServerOnly("RemCard BFF proxy");

  const pathname = normalizeProxyPath(pathSegments);
  if (!pathname) {
    return buildProxyNextResponse({
      ok: false,
      status: 403,
      body: JSON.stringify({ error: "Invalid path" }),
    });
  }

  const bodyText =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  const result = await proxyRemcardRequest({
    method: request.method,
    pathname,
    search: request.nextUrl.search,
    contentType: request.headers.get("content-type"),
    cookieHeader: request.headers.get("cookie"),
    origin: request.headers.get("origin"),
    bodyText,
    idempotencyKeyHeader:
      request.method === "POST" && pathname === "/api/store/order"
        ? request.headers.get("Idempotency-Key")
        : null,
  });

  return buildProxyNextResponse(result);
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxyRequest(request, context.params.path);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxyRequest(request, context.params.path);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxyRequest(request, context.params.path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxyRequest(request, context.params.path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxyRequest(request, context.params.path);
}
