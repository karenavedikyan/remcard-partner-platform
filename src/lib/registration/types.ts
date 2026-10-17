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

export const REGISTRATION_KIND_LABELS: Record<
  RegistrationKind,
  { title: string; description: string }
> = {
  agent: {
    title: "Агент",
    description: "Рекомендуете клиентов партнёрам RemCard и получаете вознаграждение.",
  },
  specialist: {
    title: "Специалист",
    description: "Оказываете услуги по ремонту и работаете с партнёрами RemCard.",
  },
  store: {
    title: "Магазин",
    description: "Продаёте материалы и товары для ремонта клиентам RemCard.",
  },
  company: {
    title: "Компания",
    description: "Объединяете несколько направлений: услуги, магазин или филиалы.",
  },
  employee: {
    title: "Сотрудник",
    description: "Работаете в команде партнёра по приглашению организации.",
  },
};

export const REGISTRATION_KIND_TO_PARTNER_TYPE: Partial<
  Record<RegistrationKind, "MASTER" | "STORE" | "COMPANY">
> = {
  specialist: "MASTER",
  store: "STORE",
  company: "COMPANY",
};
