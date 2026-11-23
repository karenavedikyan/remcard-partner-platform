import { describe, expect, it } from "vitest";
import {
  buildInviteShareText,
  discussionTemplateText,
  draftIsDirty,
  stepFieldErrors,
  termsTemplateText,
} from "./invite-wizard";

describe("mini-app invite wizard helpers", () => {
  it("validates partner name and message per step", () => {
    const empty = stepFieldErrors({
      step: 1,
      kind: "terms",
      name: "",
      note: "",
      intendedType: "",
      requiresIntendedType: true,
      nameMax: 120,
      noteMax: 400,
    });
    expect(empty.name).toBeTruthy();
    expect(empty.type).toBeTruthy();

    const ok = stepFieldErrors({
      step: 2,
      kind: "discussion",
      name: "Дом материалов",
      note: "Текст",
      intendedType: "",
      requiresIntendedType: false,
      nameMax: 120,
      noteMax: 500,
    });
    expect(Object.keys(ok)).toHaveLength(0);
  });

  it("builds share text with URL", () => {
    const text = buildInviteShareText({
      url: "https://prof.remcard.ru/invite/tok",
      previewPath: "/invite/tok",
      expiresAt: "2099-01-01T00:00:00.000Z",
      recipientLabel: "Иван",
      note: "Здравствуйте",
      kind: "discussion",
      intendedType: "",
      termsSummary: [],
    });
    expect(text).toContain("Здравствуйте");
    expect(text).toContain("https://prof.remcard.ru/invite/tok");
  });

  it("tracks dirty draft", () => {
    expect(draftIsDirty({ ready: false, step: 1, name: "", note: "", intendedType: "" })).toBe(
      false,
    );
    expect(draftIsDirty({ ready: false, step: 2, name: "", note: "", intendedType: "" })).toBe(
      true,
    );
    expect(draftIsDirty({ ready: true, step: 3, name: "x", note: "y", intendedType: "STORE" })).toBe(
      false,
    );
  });

  it("uses role templates without demo URLs", () => {
    expect(termsTemplateText("short", "Магазин")).toMatch(/Магазин/);
    expect(discussionTemplateText("business")).toMatch(/RemCard/);
    expect(discussionTemplateText("business")).not.toMatch(/demo/i);
  });
});