import { describe, expect, it } from "vitest";
import { resolveDataTheme, isThemePreference } from "./theme-preference";

describe("theme-preference", () => {
  it("resolves explicit light and dark", () => {
    expect(resolveDataTheme("light", true)).toBe("light");
    expect(resolveDataTheme("dark", false)).toBe("dark");
  });

  it("follows system preference when theme is system", () => {
    expect(resolveDataTheme("system", true)).toBe("dark");
    expect(resolveDataTheme("system", false)).toBe("light");
  });

  it("validates stored values", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("invalid")).toBe(false);
  });
});
