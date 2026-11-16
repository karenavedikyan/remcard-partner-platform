import { describe, expect, it } from "vitest";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";

describe("BFF allowlist: receiving funnel and client-appeals routes", () => {
  it("allows only GET for the funnel aggregation, with or without a query string", () => {
    expect(isAllowedProxyRoute("GET", "/api/pro/client-appeals/funnel")).toBe(true);
    expect(isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/funnel")).toBe(false);
    expect(isAllowedProxyRoute("POST", "/api/pro/client-appeals/funnel")).toBe(false);
    expect(isAllowedProxyRoute("DELETE", "/api/pro/client-appeals/funnel")).toBe(false);
  });

  it("keeps the existing appeal routes unchanged", () => {
    expect(isAllowedProxyRoute("GET", "/api/pro/client-appeals")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/pro/client-appeals/ap_1")).toBe(true);
    expect(isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/ap_1")).toBe(true);
    expect(isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/ap_1/stage")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/client-appeals/ap_1/order-link")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/client-appeals/batch")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/pro/client-appeals/working-stages")).toBe(true);
  });
});
