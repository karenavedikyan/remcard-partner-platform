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
    body: { login, password },
  });
}

export async function adminPasswordChange(currentPassword: string, newPassword: string) {
  return remcardFetch<{ ok: boolean }>("/api/pro/admin/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function createProfTestUser(body: {
  displayName: string;
  kind: "agent" | "master" | "store" | "company";
  city: string;
}) {
  return remcardFetch("/api/pro/admin/test-users", { method: "POST", body });
}

export async function disableProfTestUser(id: string) {
  return remcardFetch(`/api/pro/admin/test-users/${id}`, {
    method: "PATCH",
    body: { action: "disable" },
  });
}
