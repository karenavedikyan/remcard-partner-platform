import { appConfig, assertServerOnly, isBackendConfigured } from "@/lib/config";
import type { AuthMeResponse } from "@/lib/api-client";
import {
  applyUpstreamAuthHeaders,
  assertBackendUrlWithoutCredentials,
} from "@/lib/remcard-upstream-auth";

export async function fetchRemcardUpstream<T>(
  path: string,
  init?: RequestInit,
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; configured: boolean }
> {
  assertServerOnly("fetchRemcardUpstream");

  if (!isBackendConfigured() || !appConfig.remcardApiBaseUrl) {
    return {
      ok: false,
      status: 503,
      message: "Test backend is not configured",
      configured: false,
    };
  }

  let backendBaseUrl: string;
  try {
    backendBaseUrl = assertBackendUrlWithoutCredentials(appConfig.remcardApiBaseUrl);
  } catch (error) {
    return {
      ok: false,
      status: 503,
      message: error instanceof Error ? error.message : "Invalid backend URL",
      configured: true,
    };
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init?.headers);
  const auth = applyUpstreamAuthHeaders(headers);
  if (!auth.ok) {
    return {
      ok: false,
      status: 503,
      message: auth.message,
      configured: true,
    };
  }

  const response = await fetch(`${backendBaseUrl}${normalizedPath}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: text || response.statusText,
      configured: true,
    };
  }

  const data = text ? (JSON.parse(text) as T) : (null as T);
  return { ok: true, data };
}

export async function getAuthMeServer(cookieHeader?: string | null) {
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;
  return fetchRemcardUpstream<AuthMeResponse>("/api/auth/me", { headers });
}
