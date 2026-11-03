import { describe, expect, it } from "vitest";
import { TEAM_NEW_PARTNER_EMPTY_COPY } from "@/lib/team-new-partner-empty-copy";
import { teamNewPartnerEmptyStepAction } from "./team-step-actions";

describe("teamNewPartnerEmptyStepAction", () => {
  it("always links branch step to profile branches section when invite is allowed", () => {
    const step = TEAM_NEW_PARTNER_EMPTY_COPY.steps.find((s) => s.icon === "mapPin");
    expect(step).toBeDefined();
    expect(teamNewPartnerEmptyStepAction(step!, { canInvite: true })).toEqual({
      kind: "link",
      href: "/profile?section=branches",
    });
  });

  it("still links branch step when invite is not allowed", () => {
    const step = TEAM_NEW_PARTNER_EMPTY_COPY.steps.find((s) => s.icon === "mapPin");
    expect(step).toBeDefined();
    expect(teamNewPartnerEmptyStepAction(step!, { canInvite: false })).toEqual({
      kind: "link",
      href: "/profile?section=branches",
    });
  });

  it("uses onInvite for send and shield when canInvite", () => {
    for (const icon of ["send", "shield"] as const) {
      const step = TEAM_NEW_PARTNER_EMPTY_COPY.steps.find((s) => s.icon === icon);
      expect(step).toBeDefined();
      expect(teamNewPartnerEmptyStepAction(step!, { canInvite: true })).toEqual({
        kind: "button",
        handler: "onInvite",
      });
    }
  });

  it("static invite steps when canInvite is false", () => {
    const step = TEAM_NEW_PARTNER_EMPTY_COPY.steps.find((s) => s.icon === "send");
    expect(step).toBeDefined();
    expect(teamNewPartnerEmptyStepAction(step!, { canInvite: false })).toEqual({
      kind: "none",
      noteOverride: "Доступно владельцу с правом приглашать",
    });
  });
});
