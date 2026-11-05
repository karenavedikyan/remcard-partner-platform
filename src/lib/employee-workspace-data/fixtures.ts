import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser, Partnership } from "@/lib/types";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";

/** Synthetic OPTOVIK (COMPANY) org — mirrors production feedback scenario names only. */
export const FIXTURE_OPTOVIK_ORG_ID = "org-optovik-fixture";
export const FIXTURE_OPTOVIK_OWNER_PRO_ID = "pro-optovik-owner";
export const FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID = "client-sergey-fixture";

export function fixtureOptovikOwnerProContext(): ProContextSnapshot {
  return {
    role: "ORG_OWNER",
    organization: {
      id: FIXTURE_OPTOVIK_ORG_ID,
      name: "ОПТОВИК",
      partnerType: "COMPANY",
      ownerId: FIXTURE_OPTOVIK_OWNER_PRO_ID,
    },
    effectivePermissions: flagsFromActionIds([
      "clients",
      "scan",
      "sale",
      "own",
      "ledger",
      "catalog",
      "terms",
      "team",
    ]),
  };
}

export function fixtureSergeyOrgEmployeeContext(input?: {
  canViewWallet?: boolean;
  canManagePartnerships?: boolean;
}): ProContextSnapshot {
  const canViewWallet = input?.canViewWallet ?? false;
  const canManagePartnerships = input?.canManagePartnerships ?? false;
  const actionIds: import("@/lib/prof-i-permissions").ProfIActionId[] = ["own"];
  if (canViewWallet) actionIds.push("ledger");
  if (canManagePartnerships) actionIds.push("terms");
  return {
    role: "ORG_EMPLOYEE",
    membershipPosition: "Руководитель отдела розничных продаж",
    organization: {
      id: FIXTURE_OPTOVIK_ORG_ID,
      name: "ОПТОВИК",
      partnerType: "COMPANY",
      ownerId: FIXTURE_OPTOVIK_OWNER_PRO_ID,
    },
    effectivePermissions: flagsFromActionIds(actionIds),
  };
}

export function fixtureSergeyAuthUser(): AuthUser {
  return {
    id: FIXTURE_SERGEY_CLIENT_EMPLOYEE_ID,
    role: "CLIENT",
    partnerType: null,
    partnerActivities: [],
    displayName: "Сергей",
    email: "sergey-fixture@example.test",
  } as AuthUser;
}

export function fixtureOptovikPartnershipRows(): Partnership[] {
  return [
    {
      id: "ps-fixture-1",
      status: "ACTIVE",
      storeUserId: "agent-partner-a",
      proUserId: FIXTURE_OPTOVIK_OWNER_PRO_ID,
      initiatedBy: FIXTURE_OPTOVIK_OWNER_PRO_ID,
      storeUser: {
        id: "agent-partner-a",
        displayName: "Агент Альфа",
        organizationName: "Альфа",
        partnerType: "AGENT",
        city: "Москва",
      },
      proUser: {
        id: FIXTURE_OPTOVIK_OWNER_PRO_ID,
        displayName: "ОПТОВИК",
        organizationName: "ОПТОВИК",
        partnerType: "COMPANY",
        city: "Москва",
      },
      terms: [{ category: "general", percent: 10, isExcluded: false }],
      note: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ps-fixture-2",
      status: "ACTIVE",
      storeUserId: "master-partner-b",
      proUserId: FIXTURE_OPTOVIK_OWNER_PRO_ID,
      initiatedBy: FIXTURE_OPTOVIK_OWNER_PRO_ID,
      storeUser: {
        id: "master-partner-b",
        displayName: "Мастер Бета",
        organizationName: null,
        partnerType: "MASTER",
        city: "Санкт-Петербург",
      },
      proUser: {
        id: FIXTURE_OPTOVIK_OWNER_PRO_ID,
        displayName: "ОПТОВИК",
        organizationName: "ОПТОВИК",
        partnerType: "COMPANY",
        city: "Москва",
      },
      terms: [{ category: "general", percent: 12, isExcluded: false }],
      note: null,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ] as unknown as Partnership[];
}
