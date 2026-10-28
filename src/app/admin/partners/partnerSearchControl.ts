import type {
  PartnerRegistryItem,
  PartnerSearchAdminOverride,
  PartnerSearchVisibility,
} from "@/lib/prof-admin-partners-api";

export const PARTNER_SEARCH_LIFECYCLE_ACTION = {
  show: "show_partner_search",
  hide: "hide_partner_search",
  reset: "reset_partner_search",
} as const;

export type PartnerSearchLifecycleAction =
  (typeof PARTNER_SEARCH_LIFECYCLE_ACTION)[keyof typeof PARTNER_SEARCH_LIFECYCLE_ACTION];

const HARD_GATE_CODE_FRAGMENTS = [
  "archived",
  "archive",
  "blocked",
  "block",
  "deleted",
  "delete",
  "test_user",
  "test-user",
  "dedicated_test",
  "opt_out",
  "opt-out",
  "self_hidden",
] as const;

export function normalizePartnerSearchAdminOverride(
  visibility: PartnerSearchVisibility | null | undefined,
): PartnerSearchAdminOverride {
  const raw = visibility?.adminOverride;
  if (raw === "SHOW" || raw === "HIDE") return raw;
  return "AUTO";
}

export function isHardPartnerSearchGate(visibility: PartnerSearchVisibility): boolean {
  if (visibility.visible) return false;
  const code = (visibility.reasonCode ?? "").trim().toLowerCase();
  if (!code) return false;
  return HARD_GATE_CODE_FRAGMENTS.some((fragment) => code.includes(fragment));
}

export function adminSearchOverrideSettingLabel(
  visibility: PartnerSearchVisibility | null | undefined,
): string {
  switch (normalizePartnerSearchAdminOverride(visibility)) {
    case "SHOW":
      return "Показывать (решение администратора)";
    case "HIDE":
      return "Скрыть от партнёров (решение администратора)";
    default:
      return "По правилам регистрации";
  }
}

/** Effective collaboration search label shown in registry (not registration/catalog). */
export function effectivePartnerSearchPrimaryLabel(row: PartnerRegistryItem): string | null {
  const v = row.partnerSearchVisibility;
  if (v == null || typeof v.visible !== "boolean") return null;

  const override = normalizePartnerSearchAdminOverride(v);

  if (v.visible && override === "SHOW") {
    return "Виден партнёрам по решению администратора";
  }
  if (v.visible) {
    return "Виден партнёрам";
  }
  if (override === "HIDE") {
    const base = "Скрыт от партнёров по решению администратора";
    const reason = v.reasonLabel?.trim();
    return reason ? `${base}. ${reason}` : base;
  }
  if (override === "SHOW") {
    const reason = v.reasonLabel?.trim();
    return reason
      ? `Не виден партнёрам (администратор включил показ, но действует ограничение: ${reason})`
      : "Не виден партнёрам (решение «показывать» не может обойти ограничение профиля)";
  }
  return "Не виден партнёрам";
}

export type PartnerSearchActionControl = {
  disabled: boolean;
  hint: string | null;
};

export function partnerSearchActionControl(
  row: PartnerRegistryItem,
  action: PartnerSearchLifecycleAction,
): PartnerSearchActionControl {
  const v = row.partnerSearchVisibility;
  const override = normalizePartnerSearchAdminOverride(v);

  if (action === PARTNER_SEARCH_LIFECYCLE_ACTION.show) {
    if (v && isHardPartnerSearchGate(v)) {
      return {
        disabled: true,
        hint:
          v.reasonLabel?.trim() ||
          "Профиль нельзя показать в поиске: действует жёсткое ограничение (архив, блокировка, тестовый аккаунт или отказ партнёра).",
      };
    }
    if (override === "SHOW" && v?.visible) {
      return { disabled: true, hint: "Уже показывается по решению администратора." };
    }
    return { disabled: false, hint: null };
  }

  if (action === PARTNER_SEARCH_LIFECYCLE_ACTION.hide) {
    if (override === "HIDE") {
      return { disabled: true, hint: "Уже скрыт от партнёров по решению администратора." };
    }
    return { disabled: false, hint: null };
  }

  if (override === "AUTO") {
    return { disabled: true, hint: "Уже действуют правила регистрации без переопределения." };
  }
  return { disabled: false, hint: null };
}
