import { appConfig } from "@/lib/config";

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export class RemcardApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "RemcardApiError";
    this.status = status;
    this.body = body;
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  cookieHeader?: string;
};

/**
 * Browser-safe client: calls the local BFF proxy, never the RemCard backend directly.
 * Cookies from the partner origin are forwarded server-side by the proxy route.
 */
export async function remcardFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`/api/remcard${normalizedPath}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | ApiErrorBody) : null;

  if (!response.ok) {
    const errorBody =
      payload && typeof payload === "object" ? (payload as ApiErrorBody) : null;
    throw new RemcardApiError(
      response.status,
      errorBody?.error ?? errorBody?.message ?? response.statusText,
      errorBody,
    );
  }

  return payload as T;
}

export type AuthMeResponse = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
  } | null;
};

export async function getAuthMe() {
  return remcardFetch<AuthMeResponse>("/api/auth/me");
}

export const remcardApiPaths = {
  authMe: "/api/auth/me",
  authLogout: "/api/auth/logout",
  proProfile: "/api/pro/profile",
  partnershipList: "/api/partnership/list",
  storeBonusList: "/api/store/bonus-list",
  storeOrderPreview: "/api/store/order/preview",
  storeOrder: "/api/store/order",
  certificate: "/api/certificate",
  storeCertificate: "/api/store/certificate",
} as const;

export function getRemcardApiBaseUrl() {
  return appConfig.remcardApiBaseUrl;
}
