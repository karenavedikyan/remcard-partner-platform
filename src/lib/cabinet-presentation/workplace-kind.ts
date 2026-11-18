import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import type { WorkplaceKind, WorkplaceKindSource, WorkplacePartnerType } from "./types";

export const WORKPLACE_KIND_LABELS: Record<WorkplaceKind, string> = {
  STORE: "Магазин",
  COMPANY: "Компания",
  MASTER: "Специалист",
  AGENT: "Агент",
};

const EMPLOYER_CONTEXT_ROLES = new Set(["PARTNER_EMPLOYEE", "PARTNER_MANAGER"]);

export type EmployerWorkplaceKind = "MASTER" | "AGENT";

/**
 * Kind of a specialist / agent employer from the employer brief of GET /api/pro/context.
 * Mirrors the wallet rule on the server: an employer with a company kind or an AGENT-only
 * profile is an agent; any other employer with trade data is a specialist. An employer brief
 * without any trade data (older server) stays unclassified, so the cabinet never guesses.
 */
export function classifyEmployerWorkplaceKind(
  employer: NonNullable<ProContextSnapshot["employer"]> | null | undefined,
): EmployerWorkplaceKind | null {
  if (!employer) return null;
  const activities = employer.partnerActivities ?? [];
  if (!employer.partnerType && activities.length === 0 && !employer.companyKind) return null;
  if (isPureAgentActivities(activities)) return "AGENT";
  if (employer.partnerType === "MASTER" || activities.includes("SERVICE")) return "MASTER";
  if (activities.includes("AGENT") || employer.companyKind) return "AGENT";
  return "MASTER";
}

export function resolveEmployerWorkplaceKind(
  proContext: ProContextSnapshot | null,
  contextReady: boolean,
): EmployerWorkplaceKind | null {
  if (!contextReady || !proContext) return null;
  if (!EMPLOYER_CONTEXT_ROLES.has(proContext.role)) return null;
  if (proContext.organization) return null;
  return classifyEmployerWorkplaceKind(proContext.employer);
}

export function resolveWorkplaceKind(input: {
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
  workplacePartnerType: WorkplacePartnerType | null;
  workplacePartnerTypeSource: "org-context" | "personal-profile" | null;
}): { kind: WorkplaceKind | null; source: WorkplaceKindSource } {
  const { user, workplacePartnerType } = input;
  if (workplacePartnerType) {
    return {
      kind: workplacePartnerType,
      source: input.workplacePartnerTypeSource === "org-context" ? "org-context" : "personal-profile",
    };
  }
  const employerKind = resolveEmployerWorkplaceKind(input.proContext, input.contextReady);
  if (employerKind) return { kind: employerKind, source: "employer-context" };

  if (isPureAgentActivities(user.partnerActivities) && user.role === "PRO") {
    return { kind: "AGENT", source: "personal-profile" };
  }
  if (user.partnerType === "MASTER") return { kind: "MASTER", source: "personal-profile" };
  return { kind: null, source: null };
}

function branchNameFromContext(proContext: ProContextSnapshot | null | undefined): string | null {
  if (!proContext) return null;
  const active = proContext.activeBranch?.name?.trim();
  if (active) return active;
  const assigned = (proContext.branchAssignments ?? []).filter((b) => b.status === "ACTIVE");
  if (assigned.length === 1) {
    const match = (proContext.branches ?? []).find((b) => b.id === assigned[0]!.branchId);
    const name = match?.name?.trim();
    if (name) return name;
  }
  return null;
}

/**
 * Caption under the workspace name: partner type of the workplace, plus « · branch» when the
 * employee is attached to a branch (for example «Магазин · Филиал Центр»).
 */
export function workspaceTypeCaption(input: {
  workplaceKind: WorkplaceKind | null | undefined;
  proContext: ProContextSnapshot | null | undefined;
}): string {
  const base = input.workplaceKind ? WORKPLACE_KIND_LABELS[input.workplaceKind] : "Рабочее пространство";
  const branch = input.workplaceKind ? branchNameFromContext(input.proContext) : null;
  return branch ? `${base} · ${branch}` : base;
}
