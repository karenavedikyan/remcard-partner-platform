export type HomeEmptyRole = "specialist" | "store" | "company";

export type HomeEmptyIconName =
  | "sparkles"
  | "store"
  | "building"
  | "user"
  | "handshake"
  | "ticket"
  | "percent"
  | "scan"
  | "mapPin"
  | "users";

export type HomeEmptyStep = {
  icon: HomeEmptyIconName;
  title: string;
  note: string;
};

export type HomeEmptyCopy = {
  icon: HomeEmptyIconName;
  kicker: string;
  title: string;
  lead: string;
  steps: HomeEmptyStep[];
  primaryCta: { label: string; href: string; testId: string };
  secondaryCta?: { label: string; href: string; testId: string };
};

export function homeEmptyCopy(role: HomeEmptyRole): HomeEmptyCopy {
  switch (role) {
    case "specialist":
      return {
        icon: "sparkles",
        kicker: "Первый шаг",
        title: "Начните с профиля и партнёров",
        lead: "Клиент покупает у вашего партнёра — бонус получаете вы.",
        steps: [
          {
            icon: "user",
            title: "Профиль и направления",
            note: "Чем занимаетесь и где",
          },
          {
            icon: "handshake",
            title: "Партнёры",
            note: "Магазины и коллеги с условиями для вас",
          },
          {
            icon: "ticket",
            title: "Сертификат клиенту",
            note: "Ссылка — и клиент идёт к партнёру",
          },
        ],
        primaryCta: {
          label: "Заполнить профиль",
          href: "/profile",
          testId: "es-nav-profile",
        },
        secondaryCta: {
          label: "Найти партнёра",
          href: "/partners",
          testId: "es-nav-partners",
        },
      };
    case "store":
      return {
        icon: "store",
        kicker: "Первый шаг",
        title: "Подготовьте магазин к первым клиентам",
        lead: "Партнёры направляют к вам клиентов с сертификатами — вы подтверждаете покупку.",
        steps: [
          {
            icon: "percent",
            title: "Профиль и условия",
            note: "Категории, скидка и бонус",
          },
          {
            icon: "handshake",
            title: "Партнёры",
            note: "Агенты и специалисты, которые рекомендуют вас",
          },
          {
            icon: "scan",
            title: "Проверка на кассе",
            note: "Сканируйте сертификат при покупке",
          },
        ],
        primaryCta: {
          label: "Заполнить профиль",
          href: "/profile",
          testId: "es-nav-profile",
        },
        secondaryCta: {
          label: "Найти партнёра",
          href: "/partners",
          testId: "es-nav-partners",
        },
      };
    case "company":
      return {
        icon: "building",
        kicker: "Первый шаг",
        title: "Настройте компанию за три шага",
        lead: "Филиалы, сотрудники и партнёры — в одном кабинете.",
        steps: [
          {
            icon: "mapPin",
            title: "Профиль и филиалы",
            note: "Адреса и направления",
          },
          {
            icon: "users",
            title: "Сотрудники и права",
            note: "Каждый видит только своё",
          },
          {
            icon: "handshake",
            title: "Партнёры и условия",
            note: "Кто приводит клиентов и на каких условиях",
          },
        ],
        primaryCta: {
          label: "Заполнить профиль",
          href: "/profile",
          testId: "es-nav-profile",
        },
        secondaryCta: {
          label: "Пригласить сотрудника",
          href: "/profile?section=team",
          testId: "es-nav-team",
        },
      };
  }
}
