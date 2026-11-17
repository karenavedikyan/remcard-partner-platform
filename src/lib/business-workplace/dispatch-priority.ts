import {
  resolveWorkplacePartnerTypeResolution,
  shouldPreferBusinessWorkplaceDispatch,
} from "@/lib/cabinet-presentation/resolve";
import { isPartnerAssistantContext } from "@/lib/business-clients/assistant";
import { resolveBusinessOwnerClientsEligibility } from "@/lib/business-clients/gate";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import {
  businessOwnerHomePartnerType,
  shouldRenderBusinessOwnerHome,
} from "@/lib/business-home/gate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { EmployeeIssuerStatus } from "@/lib/employee-issuer/types";
import type { AuthUser } from "@/lib/types";

export type BusinessSectionDispatchDecision =
  | { kind: "agent-r03" }
  | { kind: "specialist-r06" }
  | { kind: "business"; partnerType: "STORE" | "COMPANY" }
  | { kind: "legacy-issuer" }
  | {
      /** Employee without a Branch (solo-partner employee / main-organization member) of a specialist or business. */
      kind: "employee-issuer";
      canIssue: boolean;
      employerLabel: string | null;
      partnerType?: "STORE" | "COMPANY";
    }
  | { kind: "clients-unavailable" };

export function resolveBusinessSectionDispatch(input: {
  user: AuthUser;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
  r03Eligible: boolean;
  r06Eligible: boolean;
  surface: "clients" | "issuer";
  /** Server-resolved issuer workspace of an employee without a Branch (persisted rights). */
  employeeIssuer?: EmployeeIssuerStatus | null;
}): BusinessSectionDispatchDecision {
  const employee = input.employeeIssuer;
  if (input.surface === "issuer" && employee?.applicable) {
    // The EMPLOYER decides the workspace, never the employee's own CLIENT profile.
    if (employee.workspace === "agent") return { kind: "agent-r03" };
    if (employee.workspace === "specialist" || employee.workspace === "business") {
      const partnerType = input.proContext?.organization?.partnerType;
      return {
        kind: "employee-issuer",
        canIssue: employee.canIssue,
        employerLabel: employee.employerDisplayName?.trim() || null,
        ...(employee.workspace === "business" && (partnerType === "STORE" || partnerType === "COMPANY")
          ? { partnerType }
          : {}),
      };
    }
  }

  if (
    input.surface === "clients" &&
    employee?.applicable &&
    employee.workspace === "agent" &&
    input.contextReady &&
    isPartnerAssistantContext(input.proContext)
  ) {
    // Employee of an AGENT (employer resolved by the server): only the observer screen exists, never the
    // receiving CRM. Observer rights are `canManageLeads` / `canManageCertificates`, not "can issue" alone.
    const observerRead =
      employee.role !== "VIEWER" && Boolean(employee.canIssue || employee.canManageClients);
    return observerRead ? { kind: "agent-r03" } : { kind: "clients-unavailable" };
  }

  const workplace = resolveWorkplacePartnerTypeResolution({
    user: input.user,
    proContext: input.proContext,
    contextReady: input.contextReady,
  });
  const proContextRole = input.proContext?.role ?? null;

  const businessFromContext = resolveBusinessOwnerClientsEligibility({
    user: input.user,
    proContextRole,
    proContext: input.proContext,
    contextReady: input.contextReady,
  });

  const preferWorkplace = shouldPreferBusinessWorkplaceDispatch({
    proContextRole,
    workplacePartnerType: workplace.partnerType,
    workplacePartnerTypeSource: workplace.source,
  });

  if (preferWorkplace && businessFromContext.eligible) {
    return { kind: "business", partnerType: businessFromContext.partnerType };
  }

  if (input.r03Eligible) {
    return { kind: "agent-r03" };
  }
  if (input.r06Eligible) {
    return { kind: "specialist-r06" };
  }

  if (businessFromContext.eligible) {
    return { kind: "business", partnerType: businessFromContext.partnerType };
  }

  if (
    input.surface === "clients" &&
    input.contextReady &&
    input.proContext &&
    validateProContextSnapshot(input.proContext).ok &&
    isPartnerAssistantContext(input.proContext)
  ) {
    return { kind: "specialist-r06" };
  }

  if (
    input.surface === "issuer" &&
    shouldRenderBusinessOwnerHome(input.user, {
      workplacePartnerType: workplace.partnerType,
      workplaceNavFromOrgContext: workplace.source === "org-context",
    })
  ) {
    const partnerType = businessOwnerHomePartnerType(input.user, workplace.partnerType);
    if (partnerType) {
      return { kind: "business", partnerType };
    }
    return { kind: "legacy-issuer" };
  }

  return input.surface === "issuer" ? { kind: "legacy-issuer" } : { kind: "clients-unavailable" };
}
