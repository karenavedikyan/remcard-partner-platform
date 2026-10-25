import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSettlementsPageShell } from "./settlements-page-shell";

describe("resolveSettlementsPageShell", () => {
  it("keeps MASTER wallet when R05 is eligible (MASTER+AGENT)", () => {
    assert.equal(
      resolveSettlementsPageShell({ partnerType: "MASTER", r05Eligible: true }),
      "master-wallet",
    );
  });

  it("routes pure R05 agent to agent shell", () => {
    assert.equal(
      resolveSettlementsPageShell({
        partnerType: "STORE",
        partnerActivities: ["AGENT"],
        r05Eligible: true,
      }),
      "agent-r05",
    );
  });

  it("routes business store owner to master wallet even when R05 eligible", () => {
    assert.equal(
      resolveSettlementsPageShell({
        partnerType: "STORE",
        partnerActivities: ["STORE"],
        r05Eligible: true,
      }),
      "master-wallet",
    );
  });

  it("routes other PRO users to hub", () => {
    assert.equal(
      resolveSettlementsPageShell({ partnerType: "PROF", r05Eligible: false }),
      "hub",
    );
  });
});
