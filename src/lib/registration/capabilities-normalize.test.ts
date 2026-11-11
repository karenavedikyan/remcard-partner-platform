import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRegistrationCapabilities } from "./capabilities.ts";

describe("normalizeRegistrationCapabilities", () => {
  it("keeps joinRegistrationPathEnabled false when server sends false", () => {
    const caps = normalizeRegistrationCapabilities({
      contractVersion: "t",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: false,
      legacyLoginPathEnabled: true,
    });
    assert.equal(caps.joinRegistrationPathEnabled, false);
    assert.equal(caps.agentRegistrationPathEnabled, true);
  });

  it("omits joinRegistrationPathEnabled fallback to agent when undefined", () => {
    const caps = normalizeRegistrationCapabilities({
      contractVersion: "t",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      legacyLoginPathEnabled: true,
    });
    assert.equal(caps.joinRegistrationPathEnabled, true);
  });

  it("preserves explicit joinKinds.agent=false", () => {
    const caps = normalizeRegistrationCapabilities({
      contractVersion: "t",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: true,
      joinKinds: { agent: false, specialist: true },
      legacyLoginPathEnabled: true,
    });
    assert.deepEqual(caps.joinKinds, { agent: false, specialist: true });
  });
});
