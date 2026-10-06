import { assertServerOnly } from "./config";

export type UpstreamAuthResult =
  | { ok: true; header: string | null }
  | { ok: false; message: string };

function readBasicAuthEnv(): { user: string; pass: string } | null {
  const user = process.env.REMCARD_API_BASIC_USER?.trim();
  const pass = process.env.REMCARD_API_BASIC_PASSWORD?.trim();
  if (!user && !pass) {
    return null;
  }
  if (!user || !pass) {
    return null;
  }
  return { user, pass };
}

export function getUpstreamBasicAuthResult(): UpstreamAuthResult {
  assertServerOnly("getUpstreamBasicAuthResult");

  const user = process.env.REMCARD_API_BASIC_USER?.trim();
  const pass = process.env.REMCARD_API_BASIC_PASSWORD?.trim();

  if (!user && !pass) {
    return { ok: true, header: null };
  }

  if (!user || !pass) {
    return {
      ok: false,
      message:
        "REMCARD_API_BASIC_USER and REMCARD_API_BASIC_PASSWORD must both be set for upstream Basic Auth",
    };
  }

  return {
    ok: true,
    header: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
  };
}

export function applyUpstreamAuthHeaders(headers: Headers): UpstreamAuthResult {
  const auth = getUpstreamBasicAuthResult();
  if (!auth.ok) {
    return auth;
  }
  if (auth.header) {
    headers.set("authorization", auth.header);
  }
  return auth;
}

export function assertBackendUrlWithoutCredentials(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("REMCARD_API_BASE_URL must be a valid absolute URL");
  }

  if (parsed.username || parsed.password) {
    throw new Error(
      "REMCARD_API_BASE_URL must not include credentials; set REMCARD_API_BASIC_USER and REMCARD_API_BASIC_PASSWORD instead",
    );
  }

  parsed.username = "";
  parsed.password = "";
  return parsed.toString().replace(/\/+$/, "");
}
