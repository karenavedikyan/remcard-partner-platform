import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CabinetUiPreferencesResponse } from "../cabinet-ui-preferences-types.ts";
import {
  isActiveAgentCabinetContext,
  resolveActiveAgentRootRedirect,
} from "./root-destination.ts";

const basePrefs = (): CabinetUiPreferencesResponse => ({
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "agent",
  version: 1,
  theme: null,
  mobileNavKeys: ["certificates", "partners", "wallet", "profile"],
  permittedKeys: ["certificates", "clients", "partners", "wallet", "profile"],
  defaultMobileNavKeys: null,
});

describe("resolveActiveAgentRootRedirect", () => {
  it("redirects active R03 agent with certificates permission", () => {
    assert.equal(
      resolveActiveAgentRootRedirect(basePrefs(), { prefsLoadOk: true }),
      "/certificates",
    );
  });

  it("does not redirect when prefs failed to load", () => {
    assert.equal(resolveActiveAgentRootRedirect(basePrefs(), { prefsLoadOk: false }), null);
    assert.equal(resolveActiveAgentRootRedirect(null, { prefsLoadOk: true }), null);
  });

  it("does not redirect non-agent (pilot inactive)", () => {
    const prefs = { ...basePrefs(), pilotActive: false };
    assert.equal(resolveActiveAgentRootRedirect(prefs, { prefsLoadOk: true }), null);
  });

  it("does not redirect when certificates is not permitted", () => {
    const prefs = {
      ...basePrefs(),
      permittedKeys: ["home", "partners", "profile"],
      mobileNavKeys: ["home", "partners", "profile"],
    };
    assert.equal(resolveActiveAgentRootRedirect(prefs, { prefsLoadOk: true }), null);
  });

  it("does not redirect without permittedKeys (fail-closed)", () => {
    const prefs = { ...basePrefs(), permittedKeys: null, mobileNavKeys: ["certificates"] };
    assert.equal(resolveActiveAgentRootRedirect(prefs, { prefsLoadOk: true }), null);
  });

  it("enriches empty mobileNavKeys like CabinetShell when pilot active", () => {
    const prefs = {
      ...basePrefs(),
      mobileNavKeys: null,
      permittedKeys: ["certificates", "partners", "profile"],
    };
    assert.equal(resolveActiveAgentRootRedirect(prefs, { prefsLoadOk: true }), "/certificates");
  });

  it("does not redirect pilot active but missing mobile nav and empty permitted list", () => {
    const prefs = {
      ...basePrefs(),
      mobileNavKeys: null,
      permittedKeys: [],
    };
    assert.equal(resolveActiveAgentRootRedirect(prefs, { prefsLoadOk: true }), null);
    assert.equal(isActiveAgentCabinetContext(prefs), false);
  });
});
