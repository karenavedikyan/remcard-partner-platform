import { describe, expect, it } from "vitest";
import { partnersHubCertificatePolicyEntry } from "./partners-hub-entry";
import type { ProProfileResponse } from "@/lib/types";

const profile = (overrides?: Partial<ProProfileResponse["user"]>): ProProfileResponse =>
  ({
    user: {
      id: "u1",
      role: "PRO",
      partnerType: "MASTER",
      partnerActivities: [],
      displayName: "Master",
      city: "Москва",
      storeCategories: [],
      specializations: ["doors"],
      phone: null,
      email: null,
      avatarUrl: null,
      companyKind: null,
      ...overrides,
    },
    organization: null,
    workingProfile: null,
  }) as ProProfileResponse;

describe("partnersHubCertificatePolicyEntry", () => {
  it("fails closed until pro context is ready", () => {
    expect(
      partnersHubCertificatePolicyEntry({
        proContextReady: false,
        proContext: { role: "SOLO_PARTNER", organization: null },
        profile: profile(),
      }),
    ).toBeNull();
  });

  it("fails closed without pro context role", () => {
    expect(
      partnersHubCertificatePolicyEntry({
        proContextReady: true,
        proContext: null,
        profile: profile(),
      }),
    ).toBeNull();
  });

  it("hides entry for branch employee context", () => {
    const gate = partnersHubCertificatePolicyEntry({
      proContextReady: true,
      proContext: {
        role: "BRANCH_EMPLOYEE",
        organization: { id: "org", name: "Org" },
      },
      profile: profile({ role: "CLIENT", partnerType: null, partnerActivities: [] }),
      organizationReadContext: {
        organizationId: "org",
        organizationName: "Org",
        partnerType: "STORE",
        principalProUserId: "owner",
        storeCategories: [],
        specializations: [],
        readOnlyActor: true,
      },
    });
    expect(gate?.showEntry).toBe(false);
  });

  it("shows owner entry for trusted SOLO_PARTNER without profile.organization", () => {
    const gate = partnersHubCertificatePolicyEntry({
      proContextReady: true,
      proContext: { role: "SOLO_PARTNER", organization: null },
      profile: profile({ partnerType: "MASTER" }),
    });
    expect(gate?.showEntry).toBe(true);
    expect(gate?.canEditSettings).toBe(true);
  });

  it("shows agent incoming-only without settings", () => {
    const gate = partnersHubCertificatePolicyEntry({
      proContextReady: true,
      proContext: { role: "SOLO_PARTNER", organization: null },
      profile: profile({ partnerType: "COMPANY", partnerActivities: ["AGENT"] }),
    });
    expect(gate?.showEntry).toBe(true);
    expect(gate?.canEditSettings).toBe(false);
  });
});