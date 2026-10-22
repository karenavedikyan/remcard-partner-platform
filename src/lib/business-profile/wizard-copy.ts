import type { BusinessProfilePartnerType } from "./eligibility";

export type BusinessWizardCopy = {
  kicker: string;
  journeyTitle: string;
  journeyIntro: string;
  steps: [string, string, string, string];
  basicsStepTitle: string;
  basicsRoleNote: string;
  orgFieldLabel: string;
  repFieldLabel: string;
  directionsStepTitle: string;
  directionsLead: string;
};

export function businessWizardCopy(partnerType: BusinessProfilePartnerType): BusinessWizardCopy {
  if (partnerType === "STORE") {
    return {
      kicker: "Магазин",
      journeyTitle: "Профиль без лишнего",
      journeyIntro: "Имя и город для начала. Остальное можно заполнить позже.",
      basicsStepTitle: "Представьте ваш магазин",
      basicsRoleNote:
        "Название магазина видят партнёры; имя представителя — для кабинета и связи.",
      steps: ["О магазине", "Ассортимент", "Связь и работа", "Проверка"],
      orgFieldLabel: "Название магазина",
      repFieldLabel: "Имя представителя",
      directionsStepTitle: "Что вы предлагаете?",
      directionsLead: "Выберите товары, услуги и этапы ремонта. Можно несколько.",
    };
  }
  return {
    kicker: "Компания",
    journeyTitle: "Профиль без лишнего",
    journeyIntro: "Имя и город для начала. Остальное можно заполнить позже.",
    basicsStepTitle: "Представьте вашу компанию",
    basicsRoleNote:
      "Название компании видят партнёры; имя представителя — для кабинета и связи.",
    steps: ["О компании", "Направления", "Связь и работа", "Проверка"],
    orgFieldLabel: "Название компании",
    repFieldLabel: "Имя представителя",
    directionsStepTitle: "Направления компании",
    directionsLead: "Выберите товары, услуги и этапы ремонта. Можно несколько.",
  };
}

export function businessStepPanelTitle(step: number, copy: BusinessWizardCopy): string {
  if (step === 0) return copy.basicsStepTitle;
  if (step === 1) return copy.directionsStepTitle;
  if (step === 2) return "Как с вами связаться?";
  if (step === 3) return "Всё верно?";
  return copy.steps[step] ?? "";
}

export function businessStepContextLabel(step: number): string {
  if (step === 0) return "Обязательные данные";
  if (step === 3) return "Перед сохранением";
  return "Можно пропустить";
}
