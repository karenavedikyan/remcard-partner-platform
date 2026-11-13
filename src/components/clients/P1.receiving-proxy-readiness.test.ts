import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedProxyRoute } from "@/lib/remcard-proxy";

/** Mirrors P6 @ 78fd46e7 `isReceivingBatchProxyReady` — truth from allowlist only. */
describe("receiving proxy readiness (P1 allowlist)", () => {
  it("P6 prepared slice: detail GET/PATCH, batch POST, working-stages GET/POST", () => {
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals/appeal_1"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/appeal_1"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/client-appeals/batch"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals/working-stages"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/client-appeals/working-stages"), true);
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/client-appeals/appeal_1/order-link"),
      true,
    );
  });

  it("does not claim batch ready via GET batch path", () => {
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals/batch"), false);
  });
});
