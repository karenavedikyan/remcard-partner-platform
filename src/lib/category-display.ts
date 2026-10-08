import { STORE_CATEGORY_CHIP_KEYS, STORE_CATEGORY_LABELS } from "@/lib/store-categories";

/** Same id as GENERAL_PARTNERSHIP_CATEGORY in partnership-rules. */
const GENERAL_PARTNERSHIP_CATEGORY = "general";

/** Shown when category id is unknown; never echo raw tech codes to users. */
export const UNKNOWN_CATEGORY_DISPLAY_LABEL = "Категория";

const GENERAL_CATEGORY_LABEL = "Общие условия";

/** Legacy / alternate keys that map to store categories (unchanged from prior invite flows). */
const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  all: GENERAL_PARTNERSHIP_CATEGORY,
};

const KNOWN_CATEGORY_KEYS = new Set<string>([
  GENERAL_PARTNERSHIP_CATEGORY,
  ...STORE_CATEGORY_CHIP_KEYS,
  ...Object.keys(LEGACY_CATEGORY_ALIASES),
]);

function resolveCategoryKey(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return trimmed;
  return LEGACY_CATEGORY_ALIASES[trimmed] ?? trimmed;
}

function hasCyrillic(text: string): boolean {
  return /[а-яА-ЯёЁ]/.test(text);
}

function isEnglishCategoryCode(label: string): boolean {
  const key = resolveCategoryKey(label.trim());
  return KNOWN_CATEGORY_KEYS.has(key);
}

/** Canonical Russian label for a category id (general + store chips + legacy aliases). */
export function canonicalCategoryLabel(category: string): string {
  const key = resolveCategoryKey(category);
  if (key === GENERAL_PARTNERSHIP_CATEGORY) {
    return GENERAL_CATEGORY_LABEL;
  }
  const storeLabel = STORE_CATEGORY_LABELS[key];
  if (storeLabel) {
    return storeLabel;
  }
  return UNKNOWN_CATEGORY_DISPLAY_LABEL;
}

/**
 * User-facing label: prefer canonical Russian for known ids and raw API/snapshot codes;
 * keep substantive saved Russian labels when they are not bare English keys.
 */
export function displayCategoryLabel(
  category: string,
  storedLabel?: string | null,
): string {
  const categoryKey = resolveCategoryKey(category);
  const canonical = canonicalCategoryLabel(categoryKey);
  const stored = storedLabel?.trim();
  if (!stored) {
    return canonical;
  }
  if (stored === category || stored === categoryKey || isEnglishCategoryCode(stored)) {
    return canonicalCategoryLabel(resolveCategoryKey(stored));
  }
  if (!hasCyrillic(stored)) {
    return canonical;
  }
  return stored;
}

/** When only a stored label is available (history rows), resolve display safely. */
export function displayCategoryLabelFromStored(storedLabel: string): string {
  const stored = storedLabel.trim();
  if (!stored) {
    return UNKNOWN_CATEGORY_DISPLAY_LABEL;
  }
  return displayCategoryLabel(stored, stored);
}
