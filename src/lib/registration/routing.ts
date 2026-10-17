import { sanitizeReturnTo } from "@/lib/auth-flow";

export function buildWelcomeHref(input: {
  invite?: string | null;
  returnTo?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.invite?.trim()) params.set("invite", input.invite.trim());
  const safeReturn = sanitizeReturnTo(input.returnTo);
  if (safeReturn) params.set("returnTo", safeReturn);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function buildJoinFinishHref(input: {
  invite?: string | null;
  returnTo?: string | null;
}): string {
  const params = new URLSearchParams({ phase: "finish" });
  if (input.invite?.trim()) params.set("invite", input.invite.trim());
  const safeReturn = sanitizeReturnTo(input.returnTo);
  if (safeReturn) params.set("returnTo", safeReturn);
  return `/join?${params.toString()}`;
}

export function buildJoinAuthReturnTo(input: {
  invite?: string | null;
  returnTo?: string | null;
}): string {
  return buildJoinFinishHref(input);
}

/** After agent registration completes, prefer invite continuation then safe returnTo. */
export function resolveAgentRegistrationCompleteHref(input: {
  invite?: string | null;
  returnTo?: string | null;
}): string {
  const invite = input.invite?.trim();
  if (invite && /^[\w-]+$/.test(invite)) {
    const invitePath = `/invite/${invite}`;
    if (sanitizeReturnTo(invitePath)) return invitePath;
  }
  const safe = sanitizeReturnTo(input.returnTo);
  if (safe && !safe.startsWith("/join")) return safe;
  return "/partners";
}

export function buildEmployeeLegacyJoinHref(input: {
  invite?: string | null;
  returnTo?: string | null;
}): string {
  const q = new URLSearchParams({ role: "employee", legacy: "1" });
  if (input.invite?.trim()) q.set("invite", input.invite.trim());
  const safeReturn = sanitizeReturnTo(input.returnTo);
  if (safeReturn) q.set("returnTo", safeReturn);
  return `/join?${q.toString()}`;
}

export function buildEmployeeLoginHref(input: {
  invite?: string | null;
  returnTo?: string | null;
}): string {
  const invite = input.invite?.trim();
  const returnTarget =
    invite && /^[\w-]+$/.test(invite)
      ? `/invite/${invite}`
      : sanitizeReturnTo(input.returnTo) ?? "/";
  return `/login?${new URLSearchParams({ returnTo: returnTarget }).toString()}`;
}
