import { describe, expect, it } from "vitest";
import {
  ctaLabelForIssuerCode,
  ctaLabelForIssuerFocus,
  parseProfileFocusFromQuery,
  profileHrefForIssuerFocus,
  profileHrefForIssuerMissing,
  resolveFocusableElement,
} from "./recommendation-profile-focus";

describe("recommendation-profile-focus", () => {
  it("builds profile deep link with returnTo and focus", () => {
    expect(profileHrefForIssuerMissing("directionOrAgent", "/recommendations/new")).toBe(
      "/profile?returnTo=%2Frecommendations%2Fnew&section=basics&focus=directions",
    );
    expect(profileHrefForIssuerMissing("city", "/recommendations/new")).toContain("focus=city");
    expect(profileHrefForIssuerFocus("/recommendations/new", "agentActivity")).toContain(
      "focus=agentActivity",
    );
  });

  it("whitelists focus query values", () => {
    expect(parseProfileFocusFromQuery("city")).toBe("city");
    expect(parseProfileFocusFromQuery("'; DROP TABLE--")).toBeUndefined();
    expect(parseProfileFocusFromQuery("")).toBeUndefined();
  });

  it("uses choose vs fill CTA copy", () => {
    expect(ctaLabelForIssuerCode("directionOrAgent")).toBe("Выбрать в профиле");
    expect(ctaLabelForIssuerCode("publicName")).toBe("Заполнить в профиле");
    expect(ctaLabelForIssuerFocus("directions")).toBe("Выбрать специализацию");
    expect(ctaLabelForIssuerFocus("agentActivity")).toBe("Указать агента в профиле");
  });

  it("resolves focus target on input or nested control", () => {
    document.body.innerHTML =
      '<div data-profile-focus="city"><label><input id="c" /></label></div>';
    const root = document.querySelector('[data-profile-focus="city"]')!;
    const el = resolveFocusableElement(root);
    expect(el?.id).toBe("c");
    document.body.innerHTML = '<input data-profile-focus="displayName" id="d" />';
    const input = document.querySelector('[data-profile-focus="displayName"]')!;
    expect(resolveFocusableElement(input)?.id).toBe("d");
  });
});
