import { appConfig } from "@/lib/config";
import type { AuthMeResponse } from "@/lib/types";

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export type { AuthMeResponse };

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
  signal?: AbortSignal;
};

/**
 * Browser-safe client: calls the local BFF proxy, never the RemCard backend directly.
 * Cookies from the partner origin are forwarded server-side by the proxy route.
 */
export async function remcardFetchBlob(
  path: string,
  options: Omit<FetchOptions, "body"> = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`/api/remcard${normalizedPath}`, {
    method: options.method ?? "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const text = await response.text();
      const payload = text ? (JSON.parse(text) as ApiErrorBody) : null;
      message = payload?.error ?? payload?.message ?? message;
    } catch {
      // ignore parse errors for binary responses
    }
    throw new RemcardApiError(response.status, message, null);
  }

  const disposition = response.headers.get("content-disposition");
  const filenameMatch = disposition?.match(/filename=\"?([^\";]+)\"?/i);
  const blob = await response.blob();
  return { blob, filename: filenameMatch?.[1] ?? null };
}

export async function remcardFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  let response: Response;
  try {
    response = await fetch(`/api/remcard${normalizedPath}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new RemcardApiError(0, "Сетевая ошибка", null);
  }

  const text = await response.text();
  let payload: T | ApiErrorBody | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as T | ApiErrorBody;
    } catch {
      if (!response.ok) {
        throw new RemcardApiError(response.status, response.statusText, null);
      }
      throw new RemcardApiError(response.status, "Некорректный ответ сервера", null);
    }
  }

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

export async function getAuthMe() {
  return remcardFetch<AuthMeResponse>("/api/auth/me");
}

export const remcardApiPaths = {
  authMe: "/api/auth/me",
  authLogout: "/api/auth/logout",
  authVerifyCode: "/api/auth/verify-code",
  proProfile: "/api/pro/profile",
  partnershipList: "/api/partnership/list",
  storeBonusList: "/api/store/bonus-list",
  storeOrderPreview: "/api/store/order/preview",
  storeOrder: "/api/store/order",
  certificate: "/api/certificate",
  storeCertificate: "/api/store/certificate",
  storeCertificateAvailablePartners: "/api/store/certificate/available-partners",
} as const;

export function getRemcardApiBaseUrl() {
  return appConfig.remcardApiBaseUrl ?? "(not configured)";
}
