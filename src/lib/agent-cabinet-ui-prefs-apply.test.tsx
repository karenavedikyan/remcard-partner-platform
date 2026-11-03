import { describe, expect, it } from "vitest";
import { shouldApplyIncomingCabinetUiPrefs } from "@/lib/agent-cabinet-ui-prefs-apply";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

const base = (version: number): CabinetUiPreferencesResponse => ({
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "ctx",
  version,
  theme: "system",
  mobileNavKeys: ["home"],
  permittedKeys: ["home", "clients"],
  defaultMobileNavKeys: null,
});

describe("shouldApplyIncomingCabinetUiPrefs", () => {
  it("always applies PATCH results", () => {
    expect(shouldApplyIncomingCabinetUiPrefs(5, base(3), 1, "patch")).toBe(true);
  });

  it("ignores GET with lower version", () => {
    expect(shouldApplyIncomingCabinetUiPrefs(5, base(4), 0, "get")).toBe(false);
  });

  it("applies GET with higher version", () => {
    expect(shouldApplyIncomingCabinetUiPrefs(5, base(6), 0, "get")).toBe(true);
  });

  it("blocks GET while save is in flight", () => {
    expect(shouldApplyIncomingCabinetUiPrefs(5, base(6), 1, "get")).toBe(false);
  });

  it("force-clears via auth-failure regardless of version or save in flight", () => {
    const neutral = base(0);
    expect(shouldApplyIncomingCabinetUiPrefs(9, neutral, 3, "auth-failure")).toBe(true);
  });
});
