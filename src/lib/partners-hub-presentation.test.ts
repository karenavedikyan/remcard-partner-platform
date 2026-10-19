import { describe, expect, it } from "vitest";
import { resolvePartnersHubPresentation } from "./partners-hub-presentation";

describe("resolvePartnersHubPresentation", () => {
  it("prefers agent r04 when r04 eligible even if r06 eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: true },
      r06: { featureEnabled: true, eligible: true },
    });
    expect(p.audience).toBe("agent-r04");
    expect(p.defaultSearchRole).toBe("agent");
  });

  it("uses specialist shared shell only when r06 feature and eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: true, eligible: true },
    });
    expect(p.audience).toBe("specialist-r04");
    expect(p.defaultSearchRole).toBeUndefined();
  });

  it("does not enable specialist shell for r04 flag without r04 eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: true, eligible: true },
    });
    expect(p.shell).toBe("shared-r04");
    expect(p.audience).toBe("specialist-r04");
  });

  it("does not enable specialist shell when r06 eligible is false (employee gate)", () => {
    const p = resolvePartnersHubPresentation({
      r04: null,
      r06: { featureEnabled: true, eligible: false },
    });
    expect(p.shell).toBe("legacy");
    expect(p.audience).toBe("legacy");
  });

  it("does not enable specialist shell for org_owner or employed_view style denial", () => {
    for (const eligible of [false]) {
      const p = resolvePartnersHubPresentation({
        r04: { featureEnabled: false, eligible: false },
        r06: { featureEnabled: true, eligible },
      });
      expect(p.audience).toBe("legacy");
    }
  });

  it("falls back to legacy when r06 gate off or missing", () => {
    expect(
      resolvePartnersHubPresentation({
        r04: { featureEnabled: false, eligible: false },
        r06: { featureEnabled: false, eligible: false },
      }).audience,
    ).toBe("legacy");
    expect(
      resolvePartnersHubPresentation({
        r04: null,
        r06: null,
      }).audience,
    ).toBe("legacy");
  });

  it("does not attach agent defaultSearchRole for legacy store path", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: false, eligible: false },
    });
    expect(p.shell).toBe("legacy");
    expect(p.defaultSearchRole).toBeUndefined();
  });
});
