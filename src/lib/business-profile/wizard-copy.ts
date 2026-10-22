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
        "Название, представитель и город. Адреса и команду настроите отдельно.",
      steps: ["О магазине", "Ассортимент", "Связь и работа", "Проверка"],
      orgFieldLabel: "Название магазина",
      repFieldLabel: "Имя представителя",
      directionsStepTitle: "Чем вы занимаетесь?",
      directionsLead:
        "Выберите товары и услуги, которые предлагаете. Можно указать одно направление или оба.",
    };
  }
  return {
    kicker: "Компания",
    journeyTitle: "Профиль без лишнего",
    journeyIntro: "Имя и город для начала. Остальное можно заполнить позже.",
    basicsStepTitle: "Представьте вашу компанию",
    basicsRoleNote:
      "Общие данные организации. Филиалы и доступы сотрудников не нужно заполнять сейчас.",
    steps: ["О компании", "Направления", "Связь и работа", "Проверка"],
    orgFieldLabel: "Название компании",
    repFieldLabel: "Имя представителя",
    directionsStepTitle: "Чем вы занимаетесь?",
    directionsLead:
      "Выберите товары и услуги, которые предлагаете. Можно указать одно направление или оба.",
  };
}

export function businessStepPanelTitle(step: number, copy: BusinessWizardCopy): string {
  if (step === 0) return copy.basicsStepTitle;
  if (step === 1) return "Чем вы занимаетесь?";
  if (step === 2) return "Как с вами связаться?";
  if (step === 3) return "Всё верно?";
  return copy.steps[step] ?? "";
}

export function businessStepContextLabel(step: number): string {
  if (step === 0) return "Обязательные данные";
  if (step === 3) return "Перед сохранением";
  return "Можно пропустить";
}
