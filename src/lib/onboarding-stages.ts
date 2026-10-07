export type OnboardingStage = {
  id: string;
  icon: string;
  title: string;
  desc: string;
};

/** Mirrors navigator `pro/setup` stage list for CLIENT→PRO onboarding. */
export const ONBOARDING_STAGES: OnboardingStage[] = [
  { id: "L1-0", icon: "🔍", title: "Диагностика", desc: "Приёмка, замеры, обследование" },
  { id: "L1-1", icon: "📐", title: "Планирование", desc: "Дизайн, проект, смета" },
  { id: "L1-2", icon: "📋", title: "Согласования", desc: "Перепланировки, документы" },
  { id: "L1-3", icon: "🏗", title: "Нулевой цикл", desc: "Фундамент, коммуникации" },
  { id: "L1-4", icon: "🏚", title: "Демонтаж", desc: "Снос, вывоз мусора" },
  { id: "L1-5", icon: "🧱", title: "Конструктив", desc: "Перегородки, ГКЛ, окна" },
  { id: "L1-6", icon: "🏠", title: "Оболочка дома", desc: "Кровля, фасад, утепление" },
  { id: "L1-7", icon: "⚡", title: "Инженерия", desc: "Электрика, сантехника, вентиляция" },
  { id: "L1-8", icon: "🔨", title: "Черновая отделка", desc: "Штукатурка, стяжка, гидроизоляция" },
  { id: "L1-9", icon: "🎨", title: "Чистовая отделка", desc: "Плитка, покраска, потолки, полы" },
  { id: "L1-10", icon: "🔧", title: "Оборудование", desc: "Двери, мебель, техника, сантехника" },
  { id: "L1-11", icon: "✅", title: "Приёмка", desc: "Проверка, клининг, наладка" },
];
