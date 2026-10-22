export type BusinessHomePartnerType = "STORE" | "COMPANY";

export type BusinessHomeCopy = {
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  heroCta: string;
  heroHref: string;
  stats: [string, string, string];
  partnersStatHint: (activeCount: number | null) => string;
};

export function businessHomeCopy(partnerType: BusinessHomePartnerType): BusinessHomeCopy {
  if (partnerType === "STORE") {
    return {
      eyebrow: "Магазин",
      heroTitle: "Начните с продажи по рекомендации",
      heroLead:
        "Проверьте сертификат клиента. Бонус начисляется только после подтверждения продажи.",
      heroCta: "Проверить сертификат",
      heroHref: "/scanner",
      stats: ["Продажи сегодня", "Партнёры", "Мои операции"],
      partnersStatHint: () => "Партнёры организации",
    };
  }
  return {
    eyebrow: "Компания",
    heroTitle: "Соберите команду компании",
    heroLead:
      "Назначьте понятные должности, права и подразделения. Коллеги увидят только свои рабочие задачи.",
    heroCta: "Пригласить сотрудника",
    heroHref: "/profile?section=team",
    stats: ["Филиалы", "Сотрудники", "Партнёры"],
    partnersStatHint: (activeCount) =>
      activeCount === null
        ? "Активные партнёрства"
        : activeCount === 0
          ? "Активных партнёрств пока нет"
          : `Активных партнёрств: ${activeCount}`,
  };
}
