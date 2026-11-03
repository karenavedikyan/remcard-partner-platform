export type ProfileEmptyRole = "agent" | "specialist" | "store" | "company";

export type ProfileEmptyStep = {
  icon: string;
  title: string;
  note: string;
};

export type ProfileEmptyCopy = {
  kicker: string;
  title: string;
  lead: string;
  steps: ProfileEmptyStep[];
  ctaLabel: string;
};

const STEPS: Record<ProfileEmptyRole, ProfileEmptyStep[]> = {
  agent: [
    { icon: "user", title: "Имя и контакты", note: "Так вас увидят партнёры" },
    { icon: "mapPin", title: "Город", note: "Чтобы находить партнёров рядом" },
    { icon: "card", title: "Реквизиты", note: "Куда получать бонусы" },
  ],
  specialist: [
    { icon: "sparkles", title: "О себе и направления", note: "Что делаете и для кого" },
    { icon: "mapPin", title: "Город и контакты", note: "Чтобы вас находили партнёры" },
    { icon: "card", title: "Реквизиты", note: "Куда получать бонусы" },
  ],
  store: [
    { icon: "store", title: "Магазин и адрес", note: "Название, точка, контакты" },
    { icon: "percent", title: "Категории и условия", note: "Скидка и бонус по каждой" },
    { icon: "card", title: "Реквизиты", note: "Для расчётов с партнёрами" },
  ],
  company: [
    { icon: "building", title: "Компания и филиалы", note: "Головной офис и точки" },
    { icon: "percent", title: "Направления и условия", note: "Что предлагаете партнёрам" },
    { icon: "card", title: "Реквизиты", note: "Для расчётов с партнёрами" },
  ],
};

export function profileEmptyCopy(role: ProfileEmptyRole): ProfileEmptyCopy {
  return {
    kicker: "Пара минут",
    title: "Заполните профиль",
    lead: "Его видят партнёры и клиенты. Без профиля сертификат не создать.",
    steps: STEPS[role],
    ctaLabel: "Перейти к заполнению",
  };
}

export function businessProfileEmptyRole(
  partnerType: "STORE" | "COMPANY",
): ProfileEmptyRole {
  return partnerType === "STORE" ? "store" : "company";
}
