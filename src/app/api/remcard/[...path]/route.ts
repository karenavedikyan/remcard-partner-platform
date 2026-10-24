import { NextRequest } from "next/server";
import { assertServerOnly } from "@/lib/config";
import { buildRemcardProxyRequestInput } from "@/lib/remcard-proxy-bff";
import {
  buildProxyNextResponse,
  proxyRemcardRequest,
} from "@/lib/remcard-proxy";

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  assertServerOnly("RemCard BFF proxy");

  const input = await buildRemcardProxyRequestInput(request, pathSegments);
  if (!input) {
    return buildProxyNextResponse({
      ok: false,
      status: 403,
      body: JSON.stringify({ error: "Invalid path" }),
    });
  }

  const result = await proxyRemcardRequest(input);

  return buildProxyNextResponse(result);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, (await context.params).path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, (await context.params).path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, (await context.params).path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, (await context.params).path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, (await context.params).path);
}
