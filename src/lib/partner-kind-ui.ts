export type PartnerKindUi = "agent" | "specialist" | "store" | "company";

export const PARTNER_KIND_UI_ORDER: PartnerKindUi[] = [
  "agent",
  "specialist",
  "store",
  "company",
];

export const PARTNER_KIND_UI_LABELS: Record<PartnerKindUi, string> = {
  agent: "Агент",
  specialist: "Специалист",
  store: "Магазин",
  company: "Компания",
};

export const PARTNER_KIND_UI_COPY: Record<
  PartnerKindUi,
  { description: string; changes: string }
> = {
  agent: {
    description: "Рекомендую партнёров клиентам, друзьям и подписчикам.",
    changes:
      "Сертификаты, клиенты, партнёры и кошелёк. Без обязательного каталога и специализации.",
  },
  specialist: {
    description: "Выполняю работы сам или с бригадой.",
    changes:
      "Клиенты, сертификаты и партнёры. Специализация и публикация услуг в каталоге заполняются отдельно.",
  },
  store: {
    description: "Продаём товары в одной торговой точке.",
    changes:
      "Кабинет магазина: покупатели, сертификаты и расчёты. Потребуются название и данные магазина.",
  },
  company: {
    description: "Управляю компанией, сетью или несколькими направлениями.",
    changes:
      "Кабинет компании: партнёры, клиенты, команда и филиалы. Потребуются данные организации.",
  },
};

export type PartnerTypeSwitchStateResponse = {
  currentKind: PartnerKindUi | null;
  isEmployee: boolean;
  publicId: string;
  options: Array<{
    kind: PartnerKindUi;
    label: string;
    description: string;
    isCurrent: boolean;
  }>;
  preview?: {
    currentLabel: string;
    targetLabel: string;
    changes: string;
    preservedSummary: string;
  } | null;
};
