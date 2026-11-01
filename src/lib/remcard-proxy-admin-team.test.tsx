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
import { filterAllowedCookies, isAllowedProxyRoute } from "./remcard-proxy";

describe("A17a proxy allowlist for admin team", () => {
  it("allows exact GET /api/admin/team only", () => {
    expect(isAllowedProxyRoute("GET", "/api/admin/team")).toBe(true);
  });

  it("denies writes, search, and sibling /api/admin paths", () => {
    expect(isAllowedProxyRoute("POST", "/api/admin/team")).toBe(false);
    expect(isAllowedProxyRoute("PATCH", "/api/admin/team")).toBe(false);
    expect(isAllowedProxyRoute("DELETE", "/api/admin/team")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/team/search")).toBe(false);
    expect(isAllowedProxyRoute("POST", "/api/admin/team/search")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/team/extra")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/users")).toBe(false);
    expect(isAllowedProxyRoute("PATCH", "/api/admin/users/u1")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/profile")).toBe(false);
  });

  it("forwards remcard-token cookie name for staffAuth without leaking unrelated cookies", () => {
    const filtered = filterAllowedCookies(
      "remcard-token=synthetic-staff; evil=1; remcard-pro-branch=br_1",
    );
    expect(filtered).toBe("remcard-token=synthetic-staff; remcard-pro-branch=br_1");
    expect(filtered).not.toContain("evil=");
    expect(filtered?.startsWith("remcard-token=")).toBe(true);
  });
});
