import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMobileNavReplacement,
  canSaveMobileNavEditor,
  toggleMobileNavChoice,
} from "./mobile-nav-editor";

const permitted = ["home", "partners", "wallet", "scanner", "profile"] as const;

describe("mobile-nav-editor", () => {
  it("enters replacement mode when panel is full", () => {
    const state = {
      draft: ["home", "partners", "wallet", "profile"] as const,
      replacement: null,
    };
    const next = toggleMobileNavChoice(state, "scanner", true, permitted);
    assert.equal(next.replacement, "scanner");
    assert.equal(next.draft.length, 4);
  });

  it("applies replacement and clears pending state", () => {
    const state = {
      draft: ["home", "partners", "wallet", "profile"] as const,
      replacement: "scanner" as const,
    };
    const next = applyMobileNavReplacement(state, "wallet");
    assert.deepEqual(next.draft, ["home", "partners", "scanner", "profile"]);
    assert.equal(next.replacement, null);
    assert.equal(canSaveMobileNavEditor(next), true);
  });

  it("blocks save while replacement pending", () => {
    assert.equal(
      canSaveMobileNavEditor({
        draft: ["home", "partners", "wallet", "profile"],
        replacement: "scanner",
      }),
      false,
    );
  });
});
