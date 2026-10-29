import { describe, expect, it } from "vitest";
import { resolvePartnershipDeepLinkNav } from "./deep-link-nav";

describe("resolvePartnershipDeepLinkNav", () => {
  it("routes ACTIVE to active segment", () => {
    expect(
      resolvePartnershipDeepLinkNav({ status: "ACTIVE", initiatedBy: "other" }, "me"),
    ).toEqual({ segment: "active" });
  });

  it("routes incoming INVITED to invitations/incoming", () => {
    expect(
      resolvePartnershipDeepLinkNav({ status: "INVITED", initiatedBy: "other" }, "me"),
    ).toEqual({ segment: "invitations", invitationFlow: "incoming" });
  });

  it("routes outgoing INVITED to invitations/outgoing", () => {
    expect(
      resolvePartnershipDeepLinkNav({ status: "INVITED", initiatedBy: "me" }, "me"),
    ).toEqual({ segment: "invitations", invitationFlow: "outgoing" });
  });
});
