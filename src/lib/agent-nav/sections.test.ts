import { describe, expect, it } from "vitest";
import { resolveAgentDesktopNavKeys } from "./sections";

describe("resolveAgentDesktopNavKeys", () => {
  it("uses R03 desktop order when certificates and clients are permitted", () => {
    const keys = resolveAgentDesktopNavKeys([
      "home",
      "certificates",
      "clients",
      "partners",
      "wallet",
      "scanner",
      "profile",
    ]);
    expect(keys).toEqual(["certificates", "clients", "partners", "wallet", "profile"]);
  });
});
