/** R1 canonical partner directions (informational; no R3 enable toggles). */
export type AdminSettingsPartnerKind = "agent" | "master" | "store" | "company";

export const ADMIN_SETTINGS_PARTNER_TYPES: readonly {
  id: AdminSettingsPartnerKind;
  title: string;
  description: string;
}[] = [
  {
    id: "agent",
    title: "Агент",
    description: "Посредник между клиентом и специалистом или компанией.",
  },
  {
    id: "master",
    title: "Специалист",
    description: "Исполнитель услуг; отдельный тип от компании с общим SERVICE.",
  },
  {
    id: "store",
    title: "Магазин",
    description: "Торговая точка с витриной и сертификатами.",
  },
  {
    id: "company",
    title: "Компания",
    description: "Организация с несколькими направлениями; не путать со специалистом.",
  },
] as const;

export const ADMIN_SETTINGS_PAGE_LEAD =
  "Структура проекта и опубликованные правила управления. Изменение типов партнёров и релизов — отдельные этапы (R3+).";

export const ADMIN_SETTINGS_RELEASE1_SCOPE =
  "Release 1 — управление тем, что уже идёт: реестры, модерация, уведомления, аналитика, команда, клиенты, сертификаты/сделки/отзывы/каталог (Results). Match, рекомендации, задачи и география — Release 2 и выше.";

export const ADMIN_SETTINGS_PAGE_SUBTITLE =
  "Структура проекта и опубликованные правила управления.";

export const ADMIN_SETTINGS_TYPES_PANEL_TITLE = "Направления проекта";
export const ADMIN_SETTINGS_TYPES_PANEL_LEAD = "Общая модель, без отдельных кабинетов";

export const ADMIN_SETTINGS_RULES_TITLE = "Правила управления";

export const ADMIN_SETTINGS_RULES: readonly {
  id: string;
  title: string;
  description: string;
}[] = [
  {
    id: "catalog-cooperation",
    title: "Каталог отдельно от сотрудничества",
    description: "Одно действие не меняет вторую видимость.",
  },
  {
    id: "account-reregister",
    title: "Удалить аккаунт для регистрации заново",
    description:
      "Сброс аккаунта для повторной регистрации — не архив партнёра и не восстановление скрытой карточки.",
  },
  {
    id: "notifications-context",
    title: "Уведомления с контекстом",
    description: "Кабинет, тема, партнёр и переход к записи.",
  },
] as const;

export const ADMIN_SETTINGS_DEVELOPMENT_TITLE = "Релизы и развитие";
export const ADMIN_SETTINGS_DEVELOPMENT_LEAD =
  "Информационная граница согласованного Release 1. Выбор демо-релиза в продакшене здесь не настраивается.";

export const ADMIN_SETTINGS_RELEASE2_NOTE =
  "Release 2 и выше: match и рекомендации, задачи, география, работа кураторов по назначенным направлениям.";

export const ADMIN_SETTINGS_RELEASE3_NOTE =
  "Release 3: динамическое добавление и включение/отключение типов партнёров.";

/** Handoff to existing notifications settings modal (hash opens dialog on /admin/notifications). */
export const ADMIN_SETTINGS_NOTIFICATIONS_HREF =
  "/admin/notifications#admin-notify-settings-title";
