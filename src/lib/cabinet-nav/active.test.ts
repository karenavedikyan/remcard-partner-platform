import { describe, expect, it } from "vitest";
import { isCabinetNavItemActive } from "./active";

function params(input: Record<string, string>) {
  return {
    get(name: string) {
      return input[name] ?? null;
    },
  };
}

describe("isCabinetNavItemActive", () => {
  it("highlights team deep link without activating profile", () => {
    const search = params({ section: "team" });
    expect(isCabinetNavItemActive("/profile?section=team", "/profile", search)).toBe(true);
    expect(isCabinetNavItemActive("/profile", "/profile", search)).toBe(false);
  });

  it("highlights profile root when team section is absent", () => {
    const search = params({});
    expect(isCabinetNavItemActive("/profile", "/profile", search)).toBe(true);
    expect(isCabinetNavItemActive("/profile?section=team", "/profile", search)).toBe(false);
  });

  it("matches nested routes for standard sections", () => {
    expect(isCabinetNavItemActive("/clients", "/clients/abc", null)).toBe(true);
    expect(isCabinetNavItemActive("/recommendations", "/recommendations/new", null)).toBe(true);
  });
});
