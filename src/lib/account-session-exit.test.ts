import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_SESSION_BROADCAST,
  ACCOUNT_LOGOUT_ALL_PATH,
  ACCOUNT_LOGOUT_CURRENT_PATH,
} from "./account-session-exit.ts";

describe("account-session-exit paths", () => {
  it("uses BFF-safe POST endpoints", () => {
    assert.equal(ACCOUNT_LOGOUT_CURRENT_PATH, "/api/auth/logout");
    assert.equal(ACCOUNT_LOGOUT_ALL_PATH, "/api/auth/logout-all-sessions");
    assert.match(ACCOUNT_SESSION_BROADCAST, /^remcard-/);
  });
});
