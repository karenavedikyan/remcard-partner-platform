import { describe, expect, it } from "vitest";
import {
  DISCUSSION_SUBJECT_MAX,
  clampDiscussionSubject,
  discussionSubjectError,
} from "./discussion-subject";

describe("discussion-subject", () => {
  it("mirrors DISCUSSION_SUBJECT_MAX = 500", () => {
    expect(DISCUSSION_SUBJECT_MAX).toBe(500);
  });

  it("clamps paste beyond 500", () => {
    const long = "я".repeat(501);
    expect(clampDiscussionSubject(long)).toHaveLength(500);
  });

  it("rejects empty and over-limit subjects", () => {
    expect(discussionSubjectError("   ")).toMatch(/текст/i);
    expect(discussionSubjectError("ok")).toBeNull();
    expect(discussionSubjectError("x".repeat(501))).toMatch(/500/);
  });
});
