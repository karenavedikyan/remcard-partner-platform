import { describe, expect, it } from "vitest";
import {
  assertCertificateReceivingPolicyApiAccess,
  certificateReceivingPolicyCanMutateSettings,
  isCertificateReceivingPolicyOwnerContext,
  proContextSnapshotForPartnersHubGate,
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

  it("denies ORG_OWNER without organization slice", () => {
    expect(isCertificateReceivingPolicyOwnerContext({ role: "ORG_OWNER", organization: null })).toBe(
      false,
    );
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

  it("denies partner employee with null organization", () => {
    const gate = assertCertificateReceivingPolicyApiAccess({
      user: profile({ partnerType: "MASTER", partnerActivities: [] }).user,
      proContext: { role: "PARTNER_EMPLOYEE", organization: null },
      method: "GET",
    });
    expect(gate.ok).toBe(false);
  });

  it("allows ORG_OWNER GET and PATCH for store principal", () => {
    const gate = assertCertificateReceivingPolicyApiAccess({
      user: profile({ partnerType: "STORE", partnerActivities: ["STORE"] }).user,
      proContext: {
        role: "ORG_OWNER",
        organization: { id: "org1", name: "Shop", partnerType: "STORE" },
      },
      method: "PATCH",
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.canMutateSettings).toBe(true);
      expect(gate.ownerUserId).toBe("u1");
    }
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

  it("blocks business STORE owner from agent inviter receiving settings misuse", () => {
    const user = profile({
      partnerType: "STORE",
      partnerActivities: ["STORE", "AGENT"],
    }).user;
    expect(certificateReceivingPolicyCanMutateSettings(user, { role: "SOLO_PARTNER" })).toBe(true);
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile({
        partnerType: "STORE",
        partnerActivities: ["STORE", "AGENT"],
      }),
      proContext: { role: "SOLO_PARTNER", organization: null },
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui.showEntry).toBe(true);
    expect(ui.canEditSettings).toBe(true);
  });

  it("hides entry for org staff read-only hub actor", () => {
    const snap = proContextSnapshotForPartnersHubGate({
      meProfile: profile({ partnerType: "STORE" }),
      organizationReadContext: {
        organizationId: "org1",
        organizationName: "Shop",
        partnerType: "STORE",
        principalProUserId: "owner",
        storeCategories: [],
        specializations: [],
        readOnlyActor: true,
      },
    });
    expect(snap.role).toBe("ORG_TEAM_MEMBER");
    const ui = resolveCertificateReceivingPolicyUiGate({
      profile: profile({ role: "CLIENT", partnerType: null, partnerActivities: [] }),
      proContext: snap,
      isOrgStaffWorkplaceUi: false,
    });
    expect(ui.showEntry).toBe(false);
  });
});