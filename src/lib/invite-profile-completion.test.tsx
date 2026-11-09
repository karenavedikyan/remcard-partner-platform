import { describe, expect, it } from "vitest";
import {
  buildInviteProfileCompletionHref,
  discussionPartnersHref,
  extractAuthContinuationFromPayload,
  isStrictPostOk,
  parsePartnerTypeSwitchReadiness,
  planRouteAfterInviteSuccess,
  sanitizeInternalPath,
  sanitizeInviteAuthContinuationPath,
} from "./invite-profile-completion";
import type { PartnerTypeSwitchStateResponse } from "./partner-kind-ui";

const baseSwitch = {
  currentKind: "specialist",
  isEmployee: false,
  publicId: "RC-1",
  options: [],
} satisfies PartnerTypeSwitchStateResponse;

describe("invite-profile-completion", () => {
  it("sanitizes internal paths and rejects open redirects", () => {
    expect(sanitizeInternalPath("/partners?discussion=abc", "/partners")).toBe(
      "/partners?discussion=abc",
    );
    expect(sanitizeInternalPath("//evil", "/partners")).toBe("/partners");
    expect(sanitizeInternalPath("/\\evil.example", "/partners")).toBe("/partners");
    expect(sanitizeInternalPath("/\tevil", "/partners")).toBe("/partners");
  });

  it("allows login/onboarding only on auth continuation sanitizer", () => {
    expect(sanitizeInviteAuthContinuationPath("/login?returnTo=%2Finvite%2Fx")).toBe(
      "/login?returnTo=%2Finvite%2Fx",
    );
    expect(sanitizeInviteAuthContinuationPath("/onboarding?partnerType=AGENT")).toBe(
      "/onboarding?partnerType=AGENT",
    );
    expect(sanitizeInviteAuthContinuationPath("/invite/tok")).toBe(null);
    expect(sanitizeInviteAuthContinuationPath("/\\evil")).toBe(null);
  });

  it("extracts auth continuation without returnTo", () => {
    expect(
      extractAuthContinuationFromPayload({
        redirect: "/login?step=consents",
      }),
    ).toBe("/login?step=consents");
    expect(
      extractAuthContinuationFromPayload({
        returnTo: "/invite/tok",
        code: "PARTNERSHIP_EXISTS",
      }),
    ).toBe(null);
  });

  it("requires strict ok===true for POST success", () => {
    expect(isStrictPostOk({ ok: true, redirect: "/partners" })).toBe(true);
    expect(isStrictPostOk({})).toBe(false);
  });

  it("rejects malformed switch GET as not ready", () => {
    expect(parsePartnerTypeSwitchReadiness({ isEmployee: false })).toBe(null);
    expect(parsePartnerTypeSwitchReadiness({ isEmployee: false, currentKind: "nope", options: [] })).toBe(
      null,
    );
    expect(
      parsePartnerTypeSwitchReadiness({
        ...baseSwitch,
        setupRecovery: { needed: "yes" },
      }),
    ).toBe(null);
    expect(
      parsePartnerTypeSwitchReadiness({
        ...baseSwitch,
        setupRecovery: {
          needed: true,
          targetKind: "specialist",
          requiredFields: [],
          prefill: {
            publicName: "",
            city: "",
            serviceSpecializationIds: [],
            productCategoryIds: [],
            organizationName: "",
          },
        },
      })?.status,
    ).toBe("needs_setup");
  });

  it("builds profile deep link with accepted context", () => {
    const href = buildInviteProfileCompletionHref("/partners?discussion=di-1", "discussion");
    expect(href).toContain("focus=partnerType");
    expect(href).toContain("inviteAcceptedContext=discussion");
  });

  it("plans profile completion when setup recovery needed", () => {
    const plan = planRouteAfterInviteSuccess(
      {
        status: "needs_setup",
        switchState: {
          ...baseSwitch,
          setupRecovery: {
            needed: true,
            targetKind: "specialist",
            requiredFields: ["publicName"],
            prefill: {
              publicName: "",
              city: "",
              serviceSpecializationIds: [],
              productCategoryIds: [],
              organizationName: "",
            },
          },
        },
      },
      "/partners",
      "partnership",
    );
    expect(plan.kind).toBe("profile_completion");
  });

  it("encodes discussion id safely", () => {
    expect(discussionPartnersHref("id/with space")).toBe(
      "/partners?discussion=id%2Fwith%20space",
    );
  });
});
