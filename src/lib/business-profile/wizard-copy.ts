import type { BusinessProfilePartnerType } from "./eligibility";

export type BusinessWizardCopy = {
  kicker: string;
  journeyTitle: string;
  journeyIntro: string;
  steps: [string, string, string, string];
  basicsStepTitle: string;
  basicsRoleNote: string;
  basicsFormFootnote: string;
  orgFieldHint: string;
  repFieldHint: string;
  cityFieldHint: string;
  orgFieldLabel: string;
  repFieldLabel: string;
  directionsStepTitle: string;
  directionsLead: string;
  directionsNavigatorNote: string;
};

export function businessWizardCopy(partnerType: BusinessProfilePartnerType): BusinessWizardCopy {
  if (partnerType === "STORE") {
    return {
      kicker: "Магазин",
      journeyTitle: "Профиль без лишнего",
      journeyIntro:
        "Название, представитель и город. Адреса и команду настроите отдельно.",
      basicsStepTitle: "Представьте ваш магазин",
      basicsRoleNote:
        "Название, представитель и город. Адреса и команду настроите отдельно.",
      basicsFormFootnote:
        "Поля со звёздочкой обязательны. Это всё, что нужно для первого шага.",
      orgFieldHint: "Привычное название, без юридических реквизитов.",
      repFieldHint: "Кто ведёт кабинет и общается с партнёрами.",
      cityFieldHint: "Основной город. Остальные укажете в филиалах.",
      steps: ["О магазине", "Ассортимент", "Связь и работа", "Проверка"],
      orgFieldLabel: "Название магазина",
      repFieldLabel: "Имя представителя",
      directionsStepTitle: "Чем вы занимаетесь?",
      directionsLead:
        "Выберите товары и услуги, которые предлагаете. Можно указать одно направление или оба.",
      directionsNavigatorNote:
        "Клиенты в навигаторе ремонта на remcard.ru выбирают партнёров для каждого этапа. Укажите свою специализацию и этапы, на которых вы выполняете работы или предлагаете товары: так клиент сможет найти вас в нужный момент.",
    };
  }
  return {
    kicker: "Компания",
    journeyTitle: "Профиль без лишнего",
    journeyIntro:
      "Общие данные организации. Филиалы и доступы сотрудников не нужно заполнять сейчас.",
    basicsStepTitle: "Представьте вашу компанию",
    basicsRoleNote:
      "Общие данные организации. Филиалы и доступы сотрудников не нужно заполнять сейчас.",
    basicsFormFootnote:
      "Поля со звёздочкой обязательны. Это всё, что нужно для первого шага.",
    orgFieldHint: "Привычное название, без юридических реквизитов.",
    repFieldHint: "Кто ведёт кабинет и общается с партнёрами.",
    cityFieldHint: "Основной город. Остальные укажете в филиалах.",
    steps: ["О компании", "Направления", "Связь и работа", "Проверка"],
    orgFieldLabel: "Название компании",
    repFieldLabel: "Имя представителя",
    directionsStepTitle: "Чем вы занимаетесь?",
    directionsLead:
      "Выберите товары и услуги, которые предлагаете. Можно указать одно направление или оба.",
    directionsNavigatorNote:
      "Клиенты в навигаторе ремонта на remcard.ru выбирают партнёров для каждого этапа. Укажите направления и этапы, на которых вы выполняете работы: так клиент сможет найти вас в нужный момент.",
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
