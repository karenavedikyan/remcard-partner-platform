import { NextRequest, NextResponse } from "next/server";
import { appConfig, assertServerOnly } from "@/lib/config";

const ALLOWED_PREFIXES = [
  "/api/auth/",
  "/api/pro/",
  "/api/partnership/",
  "/api/partnerships/",
  "/api/store/",
  "/api/certificate/",
  "/api/bonus/",
] as const;

function isAllowedPath(pathname: string) {
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  assertServerOnly("RemCard BFF proxy");

  const pathname = `/${pathSegments.join("/")}`;
  if (!isAllowedPath(pathname)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const targetUrl = new URL(pathname, appConfig.remcardApiBaseUrl);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstream = await fetch(targetUrl, init);
  const body = await upstream.text();

  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
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
