/** Registration entry kinds (specialist = MASTER in backend). */
export type RegistrationKind =
  | "agent"
  | "specialist"
  | "store"
  | "company"
  | "employee";

export type RegistrationCapabilities = {
  contractVersion: string;
  welcomeEnabled: boolean;
  agentRegistrationPathEnabled: boolean;
  joinRegistrationPathEnabled?: boolean;
  joinKinds?: Partial<Record<RegistrationKind, boolean>>;
  legacyLoginPathEnabled: boolean;
};

export type RegistrationDraftFields = {
  displayName?: string;
  city?: string;
  representativeName?: string;
  organizationName?: string;
};

export type RegistrationDraft = {
  kind: RegistrationKind;
  fields: RegistrationDraftFields;
  updatedAt: number;
};

/** Copy aligned to frozen prototype `roles.js` role cards (ee). */
export const REGISTRATION_KIND_LABELS: Record<
  RegistrationKind,
  { title: string; lead: string; detail: string }
> = {
  agent: {
    title: "Агент",
    lead: "Делюсь сертификатами и получаю бонусы.",
    detail: "Рекомендую друзьям, клиентам и подписчикам.",
  },
  specialist: {
    title: "Специалист",
    lead: "Выполняю работы сам или с бригадой.",
    detail: "Мастер, дизайнер, прораб, монтажник.",
  },
  store: {
    title: "Магазин",
    lead: "Продаём товары в одной торговой точке.",
    detail: "Материалы, оборудование, мебель.",
  },
  company: {
    title: "Компания",
    lead: "Управляю компанией, сетью или несколькими направлениями.",
    detail: "Офис, филиалы, товары и услуги.",
  },
  employee: {
    title: "Сотрудник",
    lead: "Работаю в команде магазина или компании.",
    detail: "Вхожу по приглашению. Доступы определяет организация.",
  },
};

export const REGISTRATION_KIND_TO_PARTNER_TYPE: Partial<
  Record<RegistrationKind, "MASTER" | "STORE" | "COMPANY">
> = {
  specialist: "MASTER",
  store: "STORE",
  company: "COMPANY",
};
