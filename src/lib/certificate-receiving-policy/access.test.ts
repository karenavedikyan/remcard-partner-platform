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

  it("shows profile entry for pure agent (incoming-only)", () => {
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile({
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      }),
      proContext: { role: "SOLO_PARTNER", organization: null },
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui.showEntry).toBe(true);
    expect(ui.canEditSettings).toBe(false);
  });
});