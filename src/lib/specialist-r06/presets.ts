import type { SpecialistKindId, SpecialistProfileDraftPayload } from "./types";

export type SpecialistPreset = {
  id: SpecialistKindId;
  label: string;
  serviceIds: string[];
  stageIds: string[];
  note?: string;
};

export const SPECIALIST_PRESETS: SpecialistPreset[] = [
  {
    id: "designer",
    label: "Дизайнер интерьера",
    serviceIds: ["design", "planning"],
    stageIds: ["L1-1"],
  },
  {
    id: "foreman",
    label: "Прораб",
    serviceIds: ["renovation"],
    stageIds: ["L1-7", "L1-8", "L1-9", "L1-11"],
  },
  {
    id: "master",
    label: "Мастер",
    serviceIds: ["finishing"],
    stageIds: ["L1-9"],
    note: "Пример чистовой отделки — замените категории при другой специализации.",
  },
  {
    id: "architect",
    label: "Архитектор",
    serviceIds: ["planning"],
    stageIds: ["L1-1", "L1-2"],
  },
  {
    id: "engineer",
    label: "Инженер по коммуникациям",
    serviceIds: ["engineering"],
    stageIds: ["L1-7"],
  },
  {
    id: "supervisor",
    label: "Специалист по приёмке и технадзору",
    /**
     * Mapping gap (owner): prototype `demo-role-supervision` («Приёмка и технический надзор») has no prod
     * service id in navigator specializations; `safety` is «Безопасность» — not equivalent. Stages only until taxonomy id exists.
     */
    serviceIds: [],
    stageIds: ["L1-0", "L1-11"],
  },
  { id: "other", label: "Свой вариант", serviceIds: [], stageIds: [] },
];

export function applySpecialistPreset(
  draft: SpecialistProfileDraftPayload,
  kind: SpecialistKindId,
  merge: boolean,
): boolean {
  const preset = SPECIALIST_PRESETS.find((p) => p.id === kind);
  if (!preset || preset.id === "other") return false;
  if (
    !merge &&
    ((draft.serviceSpecializationIds?.length ?? 0) > 0 ||
      (draft.navigatorStageIds?.length ?? 0) > 0)
  ) {
    return false;
  }
  draft.specialistKind = kind;
  draft.serviceSpecializationIds = [
    ...new Set([
      ...(merge ? draft.serviceSpecializationIds ?? [] : []),
      ...preset.serviceIds,
    ]),
  ];
  draft.navigatorStageIds = [
    ...new Set([...(merge ? draft.navigatorStageIds ?? [] : []), ...preset.stageIds]),
  ];
  return true;
}
