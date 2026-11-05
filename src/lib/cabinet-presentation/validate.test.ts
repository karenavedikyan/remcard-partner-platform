import { describe, expect, it } from "vitest";
import { validateProContextSnapshot } from "./validate";

describe("validateProContextSnapshot", () => {
  it("rejects suspended partner employee", () => {
    expect(
      validateProContextSnapshot({ role: "PARTNER_EMPLOYEE_SUSPENDED" }),
    ).toEqual({ ok: false, reason: "suspended" });
  });

  it("requires organization id/name for org member roles", () => {
    expect(
      validateProContextSnapshot({
        role: "ORG_EMPLOYEE",
        organization: { id: "", name: "X" },
      }),
    ).toEqual({ ok: false, reason: "malformed_org" });
  });
});
