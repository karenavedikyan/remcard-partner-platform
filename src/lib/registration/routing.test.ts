import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEmployeeLegacyJoinHref,
  buildEmployeeLoginHref,
  resolveAgentRegistrationCompleteHref,
} from "./routing.ts";

describe("registration routing", () => {
  it("preserves employee invite context in legacy join", () => {
    assert.match(
      buildEmployeeLegacyJoinHref({ invite: "INVITE-QA", returnTo: "/invite/INVITE-QA" }),
      /invite=INVITE-QA/,
    );
    assert.match(
      buildEmployeeLegacyJoinHref({ invite: "INVITE-QA", returnTo: "/invite/INVITE-QA" }),
      /returnTo=%2Finvite%2FINVITE-QA/,
    );
  });

  it("routes employee login to invite when present", () => {
    assert.match(buildEmployeeLoginHref({ invite: "INVITE-QA" }), /invite%2FINVITE-QA/);
  });

  it("prefers invite continuation after agent registration", () => {
    assert.equal(
      resolveAgentRegistrationCompleteHref({ invite: "INVITE-QA", returnTo: "/partners" }),
      "/invite/INVITE-QA",
    );
  });
});
