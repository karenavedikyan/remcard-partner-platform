/** @vitest-environment jsdom */
/**
 * A18b: documents client-side reject/revise validation contract used by native decision matrix.
 * Not a substitute for compiled native DoD.
 */
import { describe, expect, it } from "vitest";
import {
  MIN_MODERATION_REJECT_REASON,
  MIN_MODERATION_REVISE_COMMENT,
  validateModerationRejectClient,
  validateModerationReviseClient,
} from "@/lib/prof-admin-moderation-validation";

describe("Moderation decision client validation (A18b contract)", () => {
  it("rejects empty reason before any POST (matches role=alert copy)", () => {
    const msg = validateModerationRejectClient("");
    expect(msg).toMatch(/Укажите причину/i);
    expect(msg).toContain(String(MIN_MODERATION_REJECT_REASON));
  });

  it("accepts reason at minimum length", () => {
    expect(validateModerationRejectClient("12345")).toBeNull();
  });

  it("rejects short revise comment", () => {
    const msg = validateModerationReviseClient("short");
    expect(msg).toMatch(/доработ/i);
    expect(msg).toContain(String(MIN_MODERATION_REVISE_COMMENT));
  });
});
