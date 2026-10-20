import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRenderSpecialistHome } from "./gate.ts";

describe("shouldRenderSpecialistHome", () => {
  const r06Ok = { featureEnabled: true, eligible: true };

  it("enables for eligible MASTER when not agent cabinet", () => {
    assert.equal(
      shouldRenderSpecialistHome({ partnerType: "MASTER" }, r06Ok, { isAgentCabinet: false }),
      true,
    );
  });

  it("disables for agent cabinet, store, or ineligible r06", () => {
    assert.equal(
      shouldRenderSpecialistHome({ partnerType: "MASTER" }, r06Ok, { isAgentCabinet: true }),
      false,
    );
    assert.equal(
      shouldRenderSpecialistHome({ partnerType: "STORE" }, r06Ok, { isAgentCabinet: false }),
      false,
    );
    assert.equal(
      shouldRenderSpecialistHome(
        { partnerType: "MASTER" },
        { featureEnabled: true, eligible: false },
        { isAgentCabinet: false },
      ),
      false,
    );
  });
});
