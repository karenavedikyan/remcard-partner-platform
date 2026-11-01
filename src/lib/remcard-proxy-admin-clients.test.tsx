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
import { isAllowedProxyRoute } from "./remcard-proxy";

describe("A21a proxy allowlist for admin clients", () => {
  it("allows exact GET /api/admin/users only", () => {
    expect(isAllowedProxyRoute("GET", "/api/admin/users")).toBe(true);
  });

  it("denies writes, path variants, and wildcards", () => {
    expect(isAllowedProxyRoute("POST", "/api/admin/users")).toBe(false);
    expect(isAllowedProxyRoute("PATCH", "/api/admin/users")).toBe(false);
    expect(isAllowedProxyRoute("DELETE", "/api/admin/users")).toBe(false);
    expect(isAllowedProxyRoute("PUT", "/api/admin/users")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/users/u1")).toBe(false);
    expect(isAllowedProxyRoute("PATCH", "/api/admin/users/u1")).toBe(false);
    expect(isAllowedProxyRoute("DELETE", "/api/admin/users/u1")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/users/")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/users/search")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/team")).toBe(true);
  });
});
