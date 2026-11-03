import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/types";

export const REMCARD_PRO_BRANCH_COOKIE = "remcard-pro-branch";

function sortedPartnerActivities(user: AuthUser): string {
  return [...(user.partnerActivities ?? [])].sort().join("\u001f");
}

/** Canonical shell identity payload (server-only; never expose to client/HTML). */
export function buildCabinetShellContextPayload(
  user: AuthUser,
  proBranchCookieValue: string | undefined,
): string {
  return [
    user.id,
    user.role ?? "",
    user.staffRole ?? "",
    user.partnerType ?? "",
    sortedPartnerActivities(user),
    proBranchCookieValue ?? "",
  ].join("|");
}

export function hashCabinetShellContextPayload(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 32);
}

export function computeCabinetShellContextTokenFromUser(
  user: AuthUser | null,
  proBranchCookieValue: string | undefined,
): string {
  if (!user) {
    return "none";
  }
  return hashCabinetShellContextPayload(
    buildCabinetShellContextPayload(user, proBranchCookieValue),
  );
}

/** Request-scoped token from peek/layout user (no extra upstream session calls). */
export async function computeCabinetShellContextToken(
  user: AuthUser | null,
): Promise<string> {
  if (!user) {
    return "none";
  }
  const proBranch = (await cookies()).get(REMCARD_PRO_BRANCH_COOKIE)?.value;
  return computeCabinetShellContextTokenFromUser(user, proBranch);
}
