import { describe, expect, it } from "vitest";
import { isAllowedMutatingOrigin, isAllowedProxyRoute, proxyRemcardRequest } from "./remcard-proxy";

describe("prof admin moderation BFF proxy security", () => {
  it("allows moderation mutation paths on allowlist", () => {
    expect(
      isAllowedProxyRoute(
        "GET",
        "/api/pro/admin/moderation/organizations/org1/public-preview",
        "/api/pro/admin/moderation/partners/u1/public-preview",
      ),
    ).toBe(true);
    expect(
      isAllowedProxyRoute(
        "POST",
        "/api/pro/admin/moderation/organizations/org1/approve",
      ),
    ).toBe(true);
    expect(
      isAllowedProxyRoute("POST", "/api/pro/admin/moderation/partners/u1/reject"),
    ).toBe(true);
  });

  it("rejects mutating moderation POST with disallowed Origin before upstream", async () => {
    process.env.REMCARD_API_BASE_URL = "http://127.0.0.1:39999";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3420";
    const result = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/pro/admin/moderation/partners/u1/approve",
      search: "",
      cookieHeader: "remcard-token=test",
      contentType: "application/json",
      body: Buffer.from(JSON.stringify({ revisionToken: "t" })),
      origin: "https://evil.example",
      csrfHeader: null,
      idempotencyKeyHeader: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.body).toContain("Origin not allowed");
    }
  });

  it("rejects foreign origin for mutating requests via isAllowedMutatingOrigin", () => {
    expect(isAllowedMutatingOrigin("https://evil.example")).toBe(false);
  });
});
