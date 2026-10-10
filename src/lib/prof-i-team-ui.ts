import type { ProfIActionId } from "./prof-i-permissions";

export type ProfIPermissionRow = {
  id: ProfIActionId;
  group: string;
  name: string;
  hint: string;
  sensitive?: boolean;
};

/** Copy aligned with prototype `team-flex.js` (display only). */
export const PROF_I_PERMISSION_ROWS: ProfIPermissionRow[] = [
  {
    id: "clients",
    group: "Клиенты и продажи",
    name: "Работать с клиентами и рекомендациями",
    hint: "Создавать и вести заявки и рекомендации в выбранных подразделениях.",
  },
  {
    id: "scan",
    group: "Клиенты и продажи",
    name: "Сканировать и проверять сертификаты",
    hint: "Проверка QR и условий. Само сканирование не начисляет бонус и не подтверждает продажу.",
  },
  {
    id: "sale",
    group: "Клиенты и продажи",
    name: "Оформлять продажу и начислять бонус",
    hint: "При подтверждении продажи бонус начисляется по условиям программы.",
  },
  {
    id: "own",
    group: "Клиенты и продажи",
    name: "Просматривать свои операции",
    hint: "Свои продажи, рекомендации и связанные начисления.",
  },
  {
    id: "ledger",
    group: "Бонусы и выплаты партнёрам",
    name: "Видеть начисления и взаиморасчёты",
    hint: "История начислений, выплат и остаток к выплате по выбранным подразделениям.",
  },
  {
    id: "cash",
    group: "Бонусы и выплаты партнёрам",
    name: "Выдавать бонусы наличными",
    hint: "Фиксировать фактическую выдачу денег партнёру.",
    sensitive: true,
  },
  {
    id: "transfer",
    group: "Бонусы и выплаты партнёрам",
    name: "Перечислять бонусы партнёру",
    hint: "Выполнять или фиксировать банковскую выплату.",
    sensitive: true,
  },
  {
    id: "catalog",
    group: "Управление подразделением",
    name: "Редактировать каталог",
    hint: "Товары, услуги и публичная информация в пределах доступа.",
  },
  {
    id: "terms",
    group: "Управление подразделением",
    name: "Менять условия партнёрств",
    hint: "Настраивать условия сотрудничества.",
    sensitive: true,
  },
  {
    id: "team",
    group: "Управление подразделением",
    name: "Управлять доступом сотрудников",
    hint: "Только в разрешённых подразделениях и не выше своих полномочий.",
    sensitive: true,
  },
];

export const PROF_I_PERMISSION_GROUPS = [
  ...new Set(PROF_I_PERMISSION_ROWS.map((p) => p.group)),
];
