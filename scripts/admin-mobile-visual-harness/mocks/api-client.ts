import * as real from "../../../src/lib/api-client";
import { fetchProfTestUsers } from "./prof-admin-api";

export * from "../../../src/lib/api-client";

export async function getAuthMe() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "harness-admin",
        displayName: "Harness Admin",
        staffRole: "ADMIN" as const,
        partnerType: null,
      },
    },
  };
}

export async function remcardFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (path === "/api/pro/admin/test-users" || path.startsWith("/api/pro/admin/test-users?")) {
    return (await fetchProfTestUsers()) as T;
  }
  if (path.includes("/api/pro/admin/test-users/") && (path.endsWith("/enter") || path.endsWith("/reset"))) {
    return {} as T;
  }
  if (path === "/api/auth/me") {
    return (await getAuthMe()) as T;
  }
  throw new real.RemcardApiError(501, `Visual harness: unmocked fetch ${path}`, null);
}
