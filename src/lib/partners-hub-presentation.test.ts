import { describe, expect, it } from "vitest";
import { resolvePartnersHubPresentation } from "./partners-hub-presentation";

describe("resolvePartnersHubPresentation", () => {
  it("prefers agent r04 when eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: true },
      r06: { featureEnabled: true, hasSpecialistActivity: true },
    });
    expect(p.audience).toBe("agent-r04");
    expect(p.defaultSearchRole).toBe("agent");
    expect(p.heading.eyebrow).toBe("АГЕНТ");
  });

  it("does not treat r04 feature flag alone as agent shell", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: true, hasSpecialistActivity: true },
    });
    expect(p.audience).toBe("specialist-r04");
    expect(p.defaultSearchRole).toBeUndefined();
    expect(p.heading.eyebrow).toBe("Специалист");
  });

  it("falls back to legacy when no shared gates", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: false, hasSpecialistActivity: false },
    });
    expect(p.shell).toBe("legacy");
    expect(p.audience).toBe("legacy");
    expect(p.heading.title).toBe("Мои партнёры");
  });
});
