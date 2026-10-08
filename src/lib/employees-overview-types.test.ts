import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectPendingInvites,
  canManageTeam,
  EMPLOYEES_OVERVIEW_FIXTURE,
} from "./employees-overview-types.ts";

describe("employees-overview contract", () => {
  it("parses navigator ORG_OWNER fixture without top-level pendingInvites array", () => {
    assert.equal(EMPLOYEES_OVERVIEW_FIXTURE.myRole, "ORG_OWNER");
    assert.equal(typeof EMPLOYEES_OVERVIEW_FIXTURE.summary.pendingInvites, "number");
    assert.equal(Array.isArray(EMPLOYEES_OVERVIEW_FIXTURE.branches[0]?.pendingInvites), true);
    assert.doesNotThrow(() => collectPendingInvites(EMPLOYEES_OVERVIEW_FIXTURE));
  });

  it("detects manage rights for owner", () => {
    assert.equal(canManageTeam(EMPLOYEES_OVERVIEW_FIXTURE), true);
  });
});
