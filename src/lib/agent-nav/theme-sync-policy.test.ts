import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldPersistThemeToServer } from "./theme-sync-policy";

describe("theme-sync-policy", () => {
  it("skips persist before hydration and when theme unchanged", () => {
    assert.equal(shouldPersistThemeToServer(true, false, "dark", null), false);
    assert.equal(shouldPersistThemeToServer(true, true, "light", "light"), false);
    assert.equal(shouldPersistThemeToServer(true, true, "dark", "light"), true);
  });
});
