import { describe, expect, it } from "vitest";
import { isAllowedProxyRoute } from "./remcard-proxy";

describe("R06 tail proxy allowlist", () => {
  it("allows GET and POST only on exact taxonomy-proposals path", () => {
    expect(isAllowedProxyRoute("GET", "/api/pro/taxonomy-proposals")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/pro/taxonomy-proposals")).toBe(true);
  });

  it("rejects neighbor paths and other methods", () => {
    expect(isAllowedProxyRoute("POST", "/api/pro/taxonomy-proposals/extra")).toBe(false);
    expect(isAllowedProxyRoute("PATCH", "/api/pro/taxonomy-proposals")).toBe(false);
    expect(isAllowedProxyRoute("DELETE", "/api/pro/taxonomy-proposals")).toBe(false);
    expect(isAllowedProxyRoute("POST", "/api/pro/taxonomy-proposal")).toBe(false);
  });

  it("allows partnership discussion-invite BFF routes", () => {
    expect(isAllowedProxyRoute("POST", "/api/partnership/discussion-invite")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/partnership/discussion-invite")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/partnership/discussion-invite/disc-1")).toBe(true);
    expect(isAllowedProxyRoute("DELETE", "/api/partnership/discussion-invite/disc-1")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/partnership/discussion-invite/public/tok")).toBe(true);
    expect(isAllowedProxyRoute("POST", "/api/partnership/discussion-invite/join")).toBe(true);
    expect(isAllowedProxyRoute("GET", "/api/partnership/discussion-invite/join")).toBe(false);
  });
});
