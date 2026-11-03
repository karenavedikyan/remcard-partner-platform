/** Approved prototype copy for team section (`copy("team", role)` — role-invariant). */

export type TeamNewPartnerEmptyStep = {
  icon: "send" | "shield" | "mapPin";
  title: string;
  note: string;
};

export type TeamNewPartnerEmptyCopy = {
  kicker: string;
  title: string;
  lead: string;
  steps: TeamNewPartnerEmptyStep[];
  ctaLabel: string;
  footnote: string;
};

export const TEAM_NEW_PARTNER_EMPTY_COPY: TeamNewPartnerEmptyCopy = {
  kicker: "Пока пусто",
  title: "Пригласите команду",
  lead: "Каждый сотрудник видит только то, что нужно для его работы.",
  steps: [
    {
      icon: "send",
      title: "Отправьте ссылку",
      note: "Персональное приглашение",
    },
    {
      icon: "shield",
      title: "Назначьте должность и права",
      note: "Продажи, касса, клиенты — по отдельности",
    },
    {
      icon: "mapPin",
      title: "Укажите филиалы",
      note: "Один, несколько или офис",
    },
  ],
  ctaLabel: "Пригласить сотрудника",
  footnote: "Раздел заполнится сам, когда появятся первые данные.",
};
