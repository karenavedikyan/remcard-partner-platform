import { describe, expect, it } from "vitest";
import { SPECIALIST_PRESETS, applySpecialistPreset } from "@/lib/specialist-r06/presets";
import type { SpecialistProfileDraftPayload } from "@/lib/specialist-r06/types";

describe("specialist presets", () => {
  it.each(SPECIALIST_PRESETS.filter((p) => p.id !== "other"))(
    "auto-applies $id starter set on empty form",
    (preset) => {
      const draft: SpecialistProfileDraftPayload = { serviceSpecializationIds: [], navigatorStageIds: [] };
      expect(applySpecialistPreset(draft, preset.id, false)).toBe(true);
      expect(draft.serviceSpecializationIds).toEqual(preset.serviceIds);
      expect(draft.navigatorStageIds).toEqual(preset.stageIds);
    },
  );

  it("other does not inject services", () => {
    const draft: SpecialistProfileDraftPayload = { serviceSpecializationIds: [], navigatorStageIds: [] };
    expect(applySpecialistPreset(draft, "other", false)).toBe(false);
    expect(draft.serviceSpecializationIds).toEqual([]);
  });

  it("does not overwrite manual selection when merge=false and form non-empty", () => {
    const draft: SpecialistProfileDraftPayload = {
      serviceSpecializationIds: ["doors"],
      navigatorStageIds: ["L1-7"],
    };
    expect(applySpecialistPreset(draft, "designer", false)).toBe(false);
    expect(draft.serviceSpecializationIds).toEqual(["doors"]);
  });

  it("merge adds preset ids without duplicates", () => {
    const draft: SpecialistProfileDraftPayload = {
      serviceSpecializationIds: ["design"],
      navigatorStageIds: ["L1-1"],
    };
    expect(applySpecialistPreset(draft, "architect", true)).toBe(true);
    expect(draft.serviceSpecializationIds?.sort()).toEqual(["design", "planning"].sort());
    expect(draft.navigatorStageIds?.sort()).toEqual(["L1-1", "L1-2"].sort());
  });
});
