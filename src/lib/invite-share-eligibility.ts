export type InviteShareLifecycle = {
  status: string;
  expiresAt: string | null;
};

export function isInviteShareable(inv: InviteShareLifecycle, nowMs = Date.now()): boolean {
  const status = inv.status?.toUpperCase?.() ?? inv.status;
  if (status !== "PENDING") return false;
  if (!inv.expiresAt) return false;
  const exp = Date.parse(inv.expiresAt);
  if (!Number.isFinite(exp)) return false;
  return exp > nowMs;
}
