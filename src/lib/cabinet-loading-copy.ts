export type CabinetLoadingHeading = {
  eyebrow: string;
  title: string;
  description?: string;
};

export const CABINET_TAB_LOADING_HEADINGS: Record<string, CabinetLoadingHeading> = {
  "/": {
    eyebrow: "RemCard PROF",
    title: "Моя главная",
    description: "Обзор партнёрств и быстрые переходы к основным разделам кабинета.",
  },
  "/partners": {
    eyebrow: "RemCard PROF",
    title: "Партнёры",
    description: "Поиск, приглашения и управление партнёрствами.",
  },
  "/clients": {
    eyebrow: "RemCard PROF",
    title: "Клиенты",
    description: "Клиенты, с которыми вы работаете в кабинете.",
  },
  "/history": {
    eyebrow: "RemCard PROF",
    title: "История",
    description: "Покупки и начисления по данным сервера — без пересчёта по текущим условиям.",
  },
  "/recommendations": {
    eyebrow: "RemCard PROF",
    title: "Рекомендации",
    description: "Сертификаты и рекомендации для ваших клиентов.",
  },
  "/scanner": {
    eyebrow: "RemCard PROF",
    title: "Сканер",
    description: "Сканируйте QR или введите код, проверьте документ и подтвердите покупку.",
  },
  "/certificates": {
    eyebrow: "АГЕНТ",
    title: "Сертификаты",
    description: "Рекомендуйте. Делитесь ссылками.",
  },
  "/settlements": {
    eyebrow: "RemCard PROF",
    title: "Взаиморасчёты",
    description: "Открытые обязательства и завершённые выплаты между партнёрами.",
  },
  "/profile": {
    eyebrow: "RemCard PROF",
    title: "Профиль",
    description: "Данные кабинета, каталог и настройки.",
  },
  "/notifications": {
    eyebrow: "RemCard PROF",
    title: "Уведомления",
  },
};
