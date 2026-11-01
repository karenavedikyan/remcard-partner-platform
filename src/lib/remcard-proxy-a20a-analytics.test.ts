import { describe, expect, it } from "vitest";
import { isAllowedProxyRoute } from "./remcard-proxy";

describe("A20a admin analytics BFF allowlist (GET only)", () => {
  it("allows GET /api/admin/analytics with overview query", () => {
    expect(isAllowedProxyRoute("GET", "/api/admin/analytics")).toBe(true);
  });

  it("rejects analytics export and mutating methods", () => {
    expect(isAllowedProxyRoute("GET", "/api/admin/analytics/export")).toBe(false);
    expect(isAllowedProxyRoute("POST", "/api/admin/analytics")).toBe(false);
    expect(isAllowedProxyRoute("PATCH", "/api/admin/analytics")).toBe(false);
    expect(isAllowedProxyRoute("DELETE", "/api/admin/analytics")).toBe(false);
  });

  it("rejects other admin routes outside the single analytics GET entry", () => {
    // A21 adds this separate, exact read-only endpoint; mutations stay denied.
    expect(isAllowedProxyRoute("GET", "/api/admin/users")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/admin/users")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/users/other")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/admin/partners")).toBe(false);
  });
});
