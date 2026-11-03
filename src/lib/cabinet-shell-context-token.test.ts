import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/types";
import {
  buildCabinetShellContextPayload,
  computeCabinetShellContextTokenFromUser,
  hashCabinetShellContextPayload,
} from "@/lib/cabinet-shell-context-token";

const baseUser = (): AuthUser => ({
  id: "user-a",
  role: "PRO",
  staffRole: null,
  partnerType: "STORE",
  partnerActivities: ["b", "a"],
  displayName: "Secret Name",
  city: "Moscow",
  catalogStatus: "live",
});

describe("cabinet shell context token", () => {
  it("returns none when peek user is null", () => {
    expect(computeCabinetShellContextTokenFromUser(null, "br_1")).toBe("none");
  });

  it("is stable for the same identity and branch", () => {
    const user = baseUser();
    const t1 = computeCabinetShellContextTokenFromUser(user, "br_1");
    const t2 = computeCabinetShellContextTokenFromUser(user, "br_1");
    expect(t1).toBe(t2);
    expect(t1).toMatch(/^[a-f0-9]{32}$/);
  });

  it("sorts partnerActivities independently of input order", () => {
    const u1: AuthUser = { ...baseUser(), partnerActivities: ["z", "a", "m"] };
    const u2: AuthUser = { ...baseUser(), partnerActivities: ["a", "m", "z"] };
    expect(computeCabinetShellContextTokenFromUser(u1, undefined)).toBe(
      computeCabinetShellContextTokenFromUser(u2, undefined),
    );
  });

  it("changes when id, role, staffRole, partnerType, or branch cookie differ", () => {
    const base = computeCabinetShellContextTokenFromUser(baseUser(), "br_1");
    expect(computeCabinetShellContextTokenFromUser({ ...baseUser(), id: "user-b" }, "br_1")).not.toBe(
      base,
    );
    expect(computeCabinetShellContextTokenFromUser({ ...baseUser(), role: "ADMIN" }, "br_1")).not.toBe(
      base,
    );
    expect(
      computeCabinetShellContextTokenFromUser({ ...baseUser(), staffRole: "manager" }, "br_1"),
    ).not.toBe(base);
    expect(
      computeCabinetShellContextTokenFromUser({ ...baseUser(), partnerType: "AGENT" }, "br_1"),
    ).not.toBe(base);
    expect(computeCabinetShellContextTokenFromUser(baseUser(), "br_2")).not.toBe(base);
  });

  it("never embeds raw branch cookie or session display fields in the token", () => {
    const branch = "br_super_secret_branch_id";
    const user = baseUser();
    const token = computeCabinetShellContextTokenFromUser(user, branch);
    expect(token).not.toContain(branch);
    expect(token).not.toContain(user.id);
    expect(token).not.toContain(user.displayName ?? "");
    expect(token).not.toContain(user.city ?? "");
    expect(token).not.toContain(user.catalogStatus ?? "");
    const payload = buildCabinetShellContextPayload(user, branch);
    expect(hashCabinetShellContextPayload(payload)).toBe(token);
  });
});
