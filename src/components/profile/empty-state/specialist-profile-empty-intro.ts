import type {
  SpecialistDraftResponse,
  SpecialistProfileDraftPayload,
} from "@/lib/specialist-r06/types";

export function specialistSavedProfileHasMeaningfulProgress(
  saved: SpecialistProfileDraftPayload,
): boolean {
  const name = saved.displayName?.trim() ?? "";
  if (name.length >= 2 && name !== "Пользователь") return true;
  if ((saved.city?.trim() ?? "").length > 0) return true;
  if (saved.specialistKind) return true;
  if ((saved.specialistTitle?.trim() ?? "").length > 0) return true;
  if ((saved.serviceSpecializationIds?.length ?? 0) > 0) return true;
  if ((saved.productCategoryIds?.length ?? 0) > 0) return true;
  if ((saved.navigatorStageIds?.length ?? 0) > 0) return true;
  if ((saved.partnerWorkMode?.trim() ?? "").length > 0) return true;
  if ((saved.areas?.trim() ?? "").length > 0) return true;
  if ((saved.partnershipContactName?.trim() ?? "").length > 0) return true;
  if ((saved.partnershipContactPhone?.trim() ?? "").length > 0) return true;
  if ((saved.partnershipContactEmail?.trim() ?? "").length > 0) return true;
  if ((saved.publicSite?.trim() ?? "").length > 0) return true;
  if ((saved.publicTelegram?.trim() ?? "").length > 0) return true;
  return false;
}

/** Fail closed unless the GET body matches the known draft contract with explicit booleans. */
export function isSpecialistDraftResponseProof(data: unknown): data is SpecialistDraftResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.contractVersion !== "string" || !d.contractVersion.trim()) return false;
  if (typeof d.featureEnabled !== "boolean") return false;
  if (typeof d.hasDraft !== "boolean") return false;
  if (typeof d.profileComplete !== "boolean") return false;
  if (typeof d.step !== "number" || !Number.isFinite(d.step)) return false;
  if (typeof d.version !== "number" || !Number.isFinite(d.version)) return false;
  if (!d.payload || typeof d.payload !== "object") return false;
  if (!d.savedProfile || typeof d.savedProfile !== "object") return false;
  return true;
}

/** True only for genuinely new specialist with valid proof and no saved/draft progress. */
export function specialistOverviewShowEmptyIntro(data: unknown): boolean {
  if (!isSpecialistDraftResponseProof(data)) return false;
  if (!data.featureEnabled) return false;
  if (data.profileComplete !== false) return false;
  if (data.hasDraft !== false) return false;
  if (specialistSavedProfileHasMeaningfulProgress(data.savedProfile ?? {})) return false;
  if (specialistSavedProfileHasMeaningfulProgress(data.payload ?? {})) return false;
  return true;
}

export type SpecialistOverviewIntroMode = "pending" | "empty" | "legacy";

export function specialistOverviewIntroModeFromDraft(data: unknown): SpecialistOverviewIntroMode {
  if (data === undefined) return "pending";
  if (!specialistOverviewShowEmptyIntro(data)) return "legacy";
  return "empty";
}
