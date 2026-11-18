import { describe, expect, it } from "vitest";
import {
  assertCertificateReceivingPolicyApiAccess,
  certificateReceivingPolicyCanMutateSettings,
  isCertificateReceivingPolicyOwnerContext,
  resolveCertificateReceivingPolicyUiGate,
} from "./access";
import type { ProProfileResponse } from "@/lib/types";

function profile(overrides: Partial<ProProfileResponse["user"]> & { id?: string }): ProProfileResponse {
  return {
    user: {
      id: overrides.id ?? "u1",
      role: overrides.role ?? "PRO",
      partnerType: overrides.partnerType ?? "STORE",
      partnerActivities: overrides.partnerActivities ?? ["STORE"],
      isBlocked: overrides.isBlocked ?? false,
      displayName: "Test",
      city: "Москва",
      storeCategories: ["doors"],
      specializations: [],
      phone: null,
      email: null,
      avatarUrl: null,
      companyKind: null,
    },
    organization: null,
    workingProfile: null,
  } as ProProfileResponse;
}

describe("certificate receiving policy owner context", () => {
  it("treats SOLO_PARTNER without organization as owner (solo master)", () => {
    expect(
      isCertificateReceivingPolicyOwnerContext({ role: "SOLO_PARTNER", organization: null }),
    ).toBe(true);
  });

  it("denies delegated branch manager regardless of organization", () => {
    const gate = assertCertificateReceivingPolicyApiAccess({
      user: profile({ partnerType: "STORE" }).user,
      proContext: {
        role: "BRANCH_MANAGER",
        organization: { id: "org1", name: "Org" },
      },
      method: "GET",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(403);
  });

  it("allows pure agent GET but blocks PATCH (incoming-only)", () => {
    const user = profile({
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    }).user;
    const ctx = { role: "SOLO_PARTNER", organization: null };
    expect(certificateReceivingPolicyCanMutateSettings(user, ctx)).toBe(false);
    const getGate = assertCertificateReceivingPolicyApiAccess({
      user,
      proContext: ctx,
      method: "GET",
    });
    expect(getGate.ok).toBe(true);
    const patchGate = assertCertificateReceivingPolicyApiAccess({
      user,
      proContext: ctx,
      method: "PATCH",
    });
    expect(patchGate.ok).toBe(false);
  });

  it("denies blocked actors on API gate", () => {
    const user = profile({
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      isBlocked: true,
    }).user;
    const gate = assertCertificateReceivingPolicyApiAccess({
      user,
      proContext: { role: "SOLO_PARTNER", organization: null },
      method: "GET",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(403);
  });

  it("hides the entry for a solo agent: agents do not accept certificates", () => {
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile({
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      }),
      proContext: { role: "SOLO_PARTNER", organization: null },
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui).toEqual({ showEntry: false, canEditSettings: false });
  });

  it("hides the entry for an agent that owns an organization", () => {
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile({ partnerType: "COMPANY", partnerActivities: ["AGENT"] }),
      proContext: { role: "ORG_OWNER", organization: { id: "org-a", name: "Агентство" } },
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui).toEqual({ showEntry: false, canEditSettings: false });
  });

  it("keeps the entry hidden for an agent's employee (delegated context)", () => {
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile({ role: "CLIENT", partnerType: null, partnerActivities: [] }),
      proContext: { role: "PARTNER_EMPLOYEE", organization: null },
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui).toEqual({ showEntry: false, canEditSettings: false });
  });

  it.each([
    ["store owner", { partnerType: "STORE", partnerActivities: ["STORE"] }, { role: "ORG_OWNER", organization: { id: "o1", name: "Org" } }],
    ["company owner", { partnerType: "COMPANY", partnerActivities: ["SERVICE"] }, { role: "ORG_OWNER", organization: { id: "o2", name: "Org" } }],
    ["solo specialist", { partnerType: "MASTER", partnerActivities: ["SERVICE"] }, { role: "SOLO_PARTNER", organization: null }],
  ])("keeps the editable entry for %s", (_label, user, proContext) => {
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile(user),
      proContext,
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui).toEqual({ showEntry: true, canEditSettings: true });
  });

  it("still lets the API gate answer GET for an agent (unchanged)", () => {
    const gate = assertCertificateReceivingPolicyApiAccess({
      user: profile({ partnerType: "COMPANY", partnerActivities: ["AGENT"] }).user,
      proContext: { role: "SOLO_PARTNER", organization: null },
      method: "GET",
    });
    expect(gate.ok).toBe(true);
  });
});
