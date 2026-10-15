import { remcardFetch } from "@/lib/api-client";

export type ProfAdminCapabilities = {
  adminPasswordLogin: boolean;
  adminTestUsers: boolean;
};

export async function fetchProfAdminCapabilities() {
  return remcardFetch<ProfAdminCapabilities>("/api/pro/admin/auth/capabilities");
}

export async function adminPasswordLogin(login: string, password: string) {
  return remcardFetch<{ ok: boolean }>("/api/pro/admin/auth/password-login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}
