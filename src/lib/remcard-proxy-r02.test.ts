import { describe, expect, it } from "vitest";
import { isAllowedProxyRoute } from "./remcard-proxy";

describe("remcard-proxy R02 routes", () => {
  it("allows agent profile and requisites paths", () => {
    expect(isAllowedProxyRoute("GET", "/api/pro/agent-profile/status")).toBe(true);
    expect(isAllowedProxyRoute("PATCH", "/api/pro/agent-profile/draft")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/agent-profile/finish")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/agent-profile/enable-activity")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/pro/agent-payout-requisites")).toBe(true);
    expect(isAllowedProxyRoute("PATCH", "/api/pro/agent-payout-requisites/clxyz123")).toBe(true);
  });
});
