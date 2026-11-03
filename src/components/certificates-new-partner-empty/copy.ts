export type CertificatesNewPartnerRole = "agent" | "specialist" | "store" | "company";

export type CertificatesEmptyStep = {
  icon: string;
  title: string;
  note: string;
};

export type CertificatesEmptyCopy = {
  icon: string;
  kicker: string;
  title: string;
  lead: string;
  steps: CertificatesEmptyStep[];
  primary: { label: string; action: CertificatesEmptyAction };
  secondary?: { label: string; action: CertificatesEmptyAction };
};

export type CertificatesEmptyAction =
  | { kind: "create" }
  | { kind: "scan" }
  | { kind: "partners" }
  | { kind: "profile" };

const AGENT_HOME: CertificatesEmptyCopy = {
  icon: "ticket",
  kicker: "Первый шаг",
  title: "Первый сертификат — за минуту",
  lead: "Рекомендуйте партнёра клиенту и получайте бонус с его покупок.",
  steps: [
    { icon: "user", title: "Заполните профиль", note: "Имя и контакты видят партнёры" },
    { icon: "handshake", title: "Найдите партнёров", note: "Магазины и специалисты вашего города" },
    { icon: "ticket", title: "Создайте сертификат", note: "Отправьте клиенту ссылку" },
  ],
  primary: { label: "Создать сертификат", action: { kind: "create" } },
  secondary: { label: "Найти партнёра", action: { kind: "partners" } },
};

const RECOMMENDATIONS_ISSUER: CertificatesEmptyCopy = {
  icon: "ticket",
  kicker: "Пока пусто",
  title: "Сертификат — ваша рекомендация",
  lead: "Партнёр, клиент и условия в одной ссылке. Бонус — вам.",
  steps: [
    { icon: "handshake", title: "Выберите партнёра", note: "С согласованными условиями" },
    { icon: "user", title: "Укажите клиента", note: "Имя и телефон" },
    { icon: "share", title: "Отправьте ссылку", note: "Клиент покажет её при покупке" },
  ],
  primary: { label: "Создать сертификат", action: { kind: "create" } },
};

const RECOMMENDATIONS_SELLER: CertificatesEmptyCopy = {
  icon: "ticket",
  kicker: "Пока пусто",
  title: "Сертификаты ваших клиентов",
  lead: "Те, с которыми клиенты пришли к вам, и те, что выдали вы.",
  steps: [
    { icon: "scan", title: "Клиент пришёл с сертификатом", note: "Проверьте до продажи" },
    { icon: "check", title: "Продажа подтверждена", note: "Бонус начислен партнёру" },
    { icon: "ticket", title: "Рекомендуйте сами", note: "Выдавайте сертификаты на других партнёров" },
  ],
  primary: { label: "Проверить сертификат", action: { kind: "scan" } },
  secondary: { label: "Создать сертификат", action: { kind: "create" } },
};

export function certificatesNewPartnerEmptyCopy(role: CertificatesNewPartnerRole): CertificatesEmptyCopy {
  switch (role) {
    case "agent":
      return AGENT_HOME;
    case "specialist":
      return RECOMMENDATIONS_ISSUER;
    case "store":
    case "company":
      return RECOMMENDATIONS_SELLER;
    default:
      return RECOMMENDATIONS_ISSUER;
  }
}
