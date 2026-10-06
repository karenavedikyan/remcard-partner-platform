const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function isBackendConfigured(): boolean {
  const value = process.env.REMCARD_API_BASE_URL?.trim();
  return Boolean(value);
}

function getRemcardApiBaseUrlValue(): string | null {
  const value = process.env.REMCARD_API_BASE_URL?.trim();
  return value ? trimTrailingSlash(value) : null;
}

export function getAppUrl(): string {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}

export const appConfig = {
  get appUrl() {
    return getAppUrl();
  },
  get remcardApiBaseUrl() {
    return getRemcardApiBaseUrlValue();
  },
} as const;

export function assertServerOnly(label: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${label} is available on the server only.`);
  }
}

export function requireBackendBaseUrl(): string {
  const baseUrl = getRemcardApiBaseUrlValue();
  if (!baseUrl) {
    throw new Error(
      "REMCARD_API_BASE_URL is not configured. Set an allowed test backend URL before making upstream requests.",
    );
  }
  return baseUrl;
}
