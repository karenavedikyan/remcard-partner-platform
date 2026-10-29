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

  it("does not leave an unpaired high surrogate at the 500-unit boundary", () => {
    const value = "я".repeat(499) + "😀";
    expect(value.length).toBe(501);
    const clamped = clampDiscussionSubject(value);
    expect(clamped.length).toBe(499);
    expect(clamped).toBe("я".repeat(499));
    const last = clamped.charCodeAt(clamped.length - 1);
    expect(last < 0xd800 || last > 0xdbff).toBe(true);
  });

  it("keeps valid 500 Cyrillic and 250 emoji within the UTF-16 limit", () => {
    expect(clampDiscussionSubject("я".repeat(500))).toHaveLength(500);
    expect(clampDiscussionSubject("😀".repeat(250))).toHaveLength(500);
  });

  it("rejects empty and over-limit subjects", () => {
    expect(discussionSubjectError("   ")).toMatch(/текст/i);
    expect(discussionSubjectError("ok")).toBeNull();
    expect(discussionSubjectError("x".repeat(501))).toMatch(/500/);
  });
});
