/** @vitest-environment node */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    clear: () => mem.clear(),
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  },
});

import { describe, expect, it } from "vitest";
import {
  compareTeamMembers,
  filterTeamMembers,
  labelTeamStaffRole,
  teamMemberInitials,
  whitelistTeamListResponse,
  whitelistTeamMember,
  type AdminTeamMember,
} from "./prof-admin-team-api";

const base = (overrides: Partial<AdminTeamMember> = {}): AdminTeamMember => ({
  id: "u1",
  publicId: "RC-1",
  displayName: "Анна Владелец",
  staffRole: "OWNER",
  staffAvatarUrl: null,
  staffPosition: null,
  staffTelegram: null,
  staffBio: null,
  staffStartDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("prof-admin-team-api", () => {
  it("whitelists trustworthy fields and drops balances", () => {
    const member = whitelistTeamMember({
      id: "u1",
      publicId: "RC-1",
      displayName: "Анна",
      staffRole: "ADMIN",
      staffAvatarUrl: "/a.png",
      staffPosition: "Куратор",
      staffTelegram: "@a",
      staffBio: "bio",
      staffStartDate: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      clientBonus: { balance: 999, totalEarned: 5000 },
      passwordHash: "secret",
    });
    expect(member).toEqual({
      id: "u1",
      publicId: "RC-1",
      displayName: "Анна",
      staffRole: "ADMIN",
      staffAvatarUrl: "/a.png",
      staffPosition: "Куратор",
      staffTelegram: "@a",
      staffBio: "bio",
      staffStartDate: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(member && "clientBonus" in member).toBe(false);
    expect(member && "passwordHash" in member).toBe(false);
  });

  it("rejects unknown roles and incomplete rows", () => {
    expect(
      whitelistTeamMember({
        id: "x",
        publicId: "p",
        displayName: "n",
        staffRole: "CURATOR",
        createdAt: "t",
      }),
    ).toBeNull();
    expect(whitelistTeamMember({ id: "x" })).toBeNull();
  });

  it("sorts OWNER → ADMIN → OPERATOR → ANALYST", () => {
    const list = whitelistTeamListResponse({
      members: [
        base({ id: "3", staffRole: "OPERATOR", createdAt: "2026-01-03T00:00:00.000Z" }),
        base({ id: "1", staffRole: "OWNER", createdAt: "2026-01-02T00:00:00.000Z" }),
        base({ id: "2", staffRole: "ADMIN", createdAt: "2026-01-01T00:00:00.000Z" }),
      ],
    }).members;
    expect(list.map((m) => m.staffRole)).toEqual(["OWNER", "ADMIN", "OPERATOR"]);
  });

  it("filters loaded members locally without inventing remote search", () => {
    const members = [
      base({ id: "1", displayName: "Иван Админ", publicId: "RC-A", staffRole: "ADMIN" }),
      base({ id: "2", displayName: "Ольга Оператор", publicId: "RC-O", staffRole: "OPERATOR" }),
    ];
    expect(filterTeamMembers(members, "ольг").map((m) => m.id)).toEqual(["2"]);
    expect(filterTeamMembers(members, "RC-A").map((m) => m.id)).toEqual(["1"]);
    expect(filterTeamMembers(members, "владелец")).toEqual([]);
  });

  it("labels roles and initials for avatars", () => {
    expect(labelTeamStaffRole("OWNER")).toBe("Владелец");
    expect(labelTeamStaffRole("OPERATOR")).toBe("Оператор");
    expect(teamMemberInitials("Анна Борисова")).toBe("АБ");
    expect(
      compareTeamMembers(base({ staffRole: "ADMIN" }), base({ staffRole: "OWNER" })),
    ).toBeGreaterThan(0);
  });
});
