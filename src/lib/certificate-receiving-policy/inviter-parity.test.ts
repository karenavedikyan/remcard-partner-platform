import { describe, expect, it } from "vitest";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import { certificateReceivingPolicyCanMutateSettings } from "./access";

/**
 * Certificate policy must use baseline invitation classification — no rewrites of
 * partnership-agent-inviter or wallet admission helpers in this feature export.
 */
describe("certificate receiving policy · inviter parity (eb07d1f semantics)", () => {
  it("treats MASTER + AGENT + SERVICE as agent inviter, not business owner settings", () => {
    const mixed = {
      id: "m1",
      role: "PRO",
      partnerType: "MASTER",
      partnerActivities: ["AGENT", "SERVICE"],
    };
    expect(isAgentCooperationInviter(mixed)).toBe(true);
    expect(
      certificateReceivingPolicyCanMutateSettings(mixed, {
        role: "SOLO_PARTNER",
        organization: null,
      }),
    ).toBe(false);
  });

  it("treats STORE/COMPANY business wallet owner as non-inviter", () => {
    const store = {
      partnerType: "STORE",
      partnerActivities: ["STORE", "AGENT"],
    };
    expect(isAgentCooperationInviter(store)).toBe(false);
  });

  it("pure AGENT without STORE/SERVICE activities remains inviter", () => {
    const agent = {
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    };
    expect(isAgentCooperationInviter(agent)).toBe(true);
  });
});