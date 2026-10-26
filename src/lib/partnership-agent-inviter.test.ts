import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAgentCooperationInviter } from "./partnership-agent-inviter.ts";

describe("isAgentCooperationInviter", () => {
  it("allows legacy AGENT on technical STORE partnerType", () => {
    assert.equal(
      isAgentCooperationInviter({
        partnerType: "STORE",
        partnerActivities: ["AGENT"],
      }),
      true,
    );
  });

  it("blocks business STORE owner with STORE activity", () => {
    assert.equal(
      isAgentCooperationInviter({
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      }),
      false,
    );
  });

  it("allows COMPANY agent activity when not business store wallet", () => {
    assert.equal(
      isAgentCooperationInviter({
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      }),
      true,
    );
  });
});
