import { describe, expect, it } from "vitest";
import type { SpecialistDraftResponse } from "@/lib/specialist-r06/types";
import {
  isSpecialistDraftResponseProof,
  specialistOverviewShowEmptyIntro,
  specialistSavedProfileHasMeaningfulProgress,
} from "./specialist-profile-empty-intro";

function proof(overrides: Partial<SpecialistDraftResponse> = {}): SpecialistDraftResponse {
  return {
    contractVersion: "r06",
    featureEnabled: true,
    step: 1,
    version: 0,
    hasDraft: false,
    profileComplete: false,
    payload: {},
    savedProfile: {},
    ...overrides,
  };
}

describe("specialistOverviewShowEmptyIntro", () => {
  it("accepts true zero with explicit flags and empty saved fields", () => {
    expect(specialistOverviewShowEmptyIntro(proof())).toBe(true);
  });

  it("rejects missing profileComplete boolean", () => {
    const data = proof();
    (data as { profileComplete?: boolean }).profileComplete = undefined;
    expect(specialistOverviewShowEmptyIntro(data)).toBe(false);
  });

  it("rejects hasDraft true and partial saved name", () => {
    expect(specialistOverviewShowEmptyIntro(proof({ hasDraft: true }))).toBe(false);
    expect(
      specialistOverviewShowEmptyIntro(
        proof({ savedProfile: { displayName: "Anna", city: "Krasnodar" } }),
      ),
    ).toBe(false);
  });

  it("rejects profileComplete true", () => {
    expect(specialistOverviewShowEmptyIntro(proof({ profileComplete: true }))).toBe(false);
  });

  it("detects meaningful progress in payload even when saved empty", () => {
    expect(
      specialistSavedProfileHasMeaningfulProgress({ serviceSpecializationIds: ["x"] }),
    ).toBe(true);
    expect(
      specialistOverviewShowEmptyIntro(proof({ payload: { city: "Sochi" } })),
    ).toBe(false);
  });

  it("requires full draft response proof shape", () => {
    expect(isSpecialistDraftResponseProof({ featureEnabled: true })).toBe(false);
  });
});
