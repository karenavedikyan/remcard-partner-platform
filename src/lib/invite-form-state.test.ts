import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeInviteRows,
  buildInviteFormResetKey,
  createInitialInviteFormState,
  setInviteFormError,
  syncInviteFormState,
  updateInviteGeneralConfirmed,
  updateInviteNote,
  updateInviteRowExcluded,
  updateInviteRowPercent,
} from "./invite-form-state.ts";

describe("invite form state", () => {
  it("preserves edits across parent re-renders with the same reset key", () => {
    const resetKey = buildInviteFormResetKey("partner-1", ["doors", "plumbing"]);
    let state = createInitialInviteFormState(resetKey, ["doors", "plumbing"]);
    state = updateInviteRowPercent(state, 0, "17");
    state = updateInviteNote(state, "Комментарий для партнёра");
    state = updateInviteRowExcluded(state, 1, true);

    const afterParentRender = syncInviteFormState(state, resetKey, ["doors", "plumbing"]);
    assert.equal(afterParentRender, state);
    assert.equal(afterParentRender.rows[0]?.percent, "17");
    assert.equal(afterParentRender.note, "Комментарий для партнёра");
    assert.equal(afterParentRender.rows[1]?.excluded, true);
  });

  it("reinitializes when opening invite for another partner", () => {
    const firstKey = buildInviteFormResetKey("partner-1", ["doors"]);
    let state = createInitialInviteFormState(firstKey, ["doors"]);
    state = updateInviteRowPercent(state, 0, "17");

    const secondKey = buildInviteFormResetKey("partner-2", ["tiles"]);
    state = syncInviteFormState(state, secondKey, ["tiles"]);
    assert.equal(state.resetKey, secondKey);
    assert.equal(state.rows.length, 1);
    assert.equal(state.rows[0]?.category, "tiles");
    assert.equal(state.rows[0]?.percent, "10");
    assert.equal(state.note, "");
  });

  it("keeps user input after API error", () => {
    const resetKey = buildInviteFormResetKey("partner-1", ["doors", "plumbing"]);
    let state = createInitialInviteFormState(resetKey, ["doors", "plumbing"]);
    state = updateInviteRowPercent(state, 0, "17");
    state = updateInviteNote(state, "Не уходить");
    state = setInviteFormError(state, "Не удалось отправить приглашение");

    const afterError = syncInviteFormState(state, resetKey, ["doors", "plumbing"]);
    assert.equal(afterError.rows[0]?.percent, "17");
    assert.equal(afterError.note, "Не уходить");
    assert.match(afterError.error, /Не удалось/);
  });

  it("uses general fallback rows only when categories are empty", () => {
    const resetKey = buildInviteFormResetKey("partner-1", []);
    const state = createInitialInviteFormState(resetKey, []);
    assert.equal(state.useGeneralFallback, true);
    assert.equal(activeInviteRows(state)[0]?.category, "general");
  });

  it("requires explicit general confirmation state", () => {
    const resetKey = buildInviteFormResetKey("partner-1", []);
    let state = createInitialInviteFormState(resetKey, []);
    state = updateInviteGeneralConfirmed(state, true);
    assert.equal(state.generalConfirmed, true);
  });
});
