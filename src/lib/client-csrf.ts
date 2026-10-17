import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function ensureBrowserCsrfToken(): Promise<string | null> {
  let token = readCookie(CSRF_COOKIE);
  if (token) return token;
  const res = await fetch("/api/csrf", { method: "GET", credentials: "include", cache: "no-store" });
  if (!res.ok) return null;
  token = readCookie(CSRF_COOKIE);
  return token;
}

export async function withCsrfHeaders(headers: Record<string, string>): Promise<Record<string, string>> {
  const token = await ensureBrowserCsrfToken();
  if (token && !headers[CSRF_HEADER]) {
    headers[CSRF_HEADER] = token;
  }
  return headers;
}

export { CSRF_HEADER };
