import { describe, expect, it } from "vitest";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";

describe("R03 BFF allowlist", () => {
  it("allows agent R03 routes", () => {
    expect(isAllowedProxyRoute("GET", "/api/pro/r03/status")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/pro/agent-clients")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/agent-certificates")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/agent-certificates/batch")).toBe(true);
    expect(isAllowedProxyRoute("PATCH", "/api/certificate/RC-TEST/alias")).toBe(true);
  });
});
