import { displayCategoryLabel, UNKNOWN_CATEGORY_DISPLAY_LABEL } from "@/lib/category-display";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";

/**
 * Display labels for MASTER directions (trade ids + navigator L1 stages).
 * Trade list aligned with navigator `specializations.ts` (display only).
 */
const MASTER_TRADE_LABELS: Record<string, string> = {
  tiles: "Плитка",
  flooring: "Напольные покрытия",
  doors: "Двери",
  plumbing: "Сантехника",
  electrical: "Электрика",
  painting: "Покраска и штукатурка",
  ceilings: "Потолки",
  demolition: "Демонтаж",
  design: "Дизайн интерьера",
  landscape: "Ландшафтный дизайн",
  appraisal: "Оценка недвижимости",
  planning: "Планирование",
  rough: "Черновые работы",
  engineering: "Инженерные работы",
  finishing: "Чистовая отделка",
  renovation: "Ремонт под ключ",
  safety: "Безопасность",
  kitchen: "Кухни и мебель",
  windows: "Окна и балконы",
  climate: "Кондиционирование",
  construction: "Строительство",
  furniture: "Сборка мебели",
};

export function masterDirectionLabel(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return UNKNOWN_CATEGORY_DISPLAY_LABEL;
  if (/^L1-\d+$/.test(trimmed)) {
    const stage = ONBOARDING_STAGES.find((s) => s.id === trimmed);
    if (stage) return stage.title;
  }
  if (MASTER_TRADE_LABELS[trimmed]) {
    return MASTER_TRADE_LABELS[trimmed];
  }
  const fromStore = displayCategoryLabel(trimmed, trimmed);
  if (fromStore !== UNKNOWN_CATEGORY_DISPLAY_LABEL) {
    return fromStore;
  }
  return UNKNOWN_CATEGORY_DISPLAY_LABEL;
}
