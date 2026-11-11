import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RegistrationCapabilities } from "./types.ts";
import {
  isJoinKindRegistrationEnabled,
  parseJoinKindFromFinishReturnTo,
  resolveValidatedFinishJoinKind,
} from "./join-kind-capability.ts";

const capsAgentJoinOff: RegistrationCapabilities = {
  contractVersion: "t",
  welcomeEnabled: true,
  agentRegistrationPathEnabled: true,
  joinRegistrationPathEnabled: false,
  legacyLoginPathEnabled: true,
};

describe("join-kind capability", () => {
  it("parses role from finish returnTo", () => {
    assert.equal(
      parseJoinKindFromFinishReturnTo("/join?phase=finish&role=specialist"),
      "specialist",
    );
  });

  it("disables agent join when joinRegistrationPathEnabled is false", () => {
    assert.equal(isJoinKindRegistrationEnabled(capsAgentJoinOff, "agent"), false);
  });

  it("respects joinKinds.agent=false", () => {
    assert.equal(
      isJoinKindRegistrationEnabled(
        { ...capsAgentJoinOff, joinRegistrationPathEnabled: true, joinKinds: { agent: false } },
        "agent",
      ),
      false,
    );
  });

  it("prefers wizard kind and rejects URL mismatch", () => {
    const resolution = resolveValidatedFinishJoinKind({
      wizardKind: "agent",
      urlRole: "company",
    });
    assert.equal(resolution.status, "mismatch");
    if (resolution.status === "mismatch") {
      assert.equal(resolution.wizardKind, "agent");
      assert.equal(resolution.urlRole, "company");
    }
  });

  it("uses wizard kind when URL role absent", () => {
    assert.deepEqual(
      resolveValidatedFinishJoinKind({ wizardKind: "agent", urlRole: null }),
      { status: "ok", kind: "agent" },
    );
  });
});
