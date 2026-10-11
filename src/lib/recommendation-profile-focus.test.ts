import { describe, expect, it } from "vitest";
import { ctaLabelForIssuerCode, profileHrefForIssuerMissing } from "./recommendation-profile-focus";

describe("recommendation-profile-focus", () => {
  it("builds profile deep link with returnTo and focus", () => {
    expect(profileHrefForIssuerMissing("directionOrAgent", "/recommendations/new")).toBe(
      "/profile?returnTo=%2Frecommendations%2Fnew&section=basics&focus=agentActivity",
    );
    expect(profileHrefForIssuerMissing("city", "/recommendations/new")).toContain("focus=city");
  });

  it("uses choose vs fill CTA copy", () => {
    expect(ctaLabelForIssuerCode("directionOrAgent")).toBe("Выбрать в профиле");
    expect(ctaLabelForIssuerCode("publicName")).toBe("Заполнить в профиле");
  });
});
