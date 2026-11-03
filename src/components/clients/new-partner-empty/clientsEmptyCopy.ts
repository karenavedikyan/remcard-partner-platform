export type ClientsEmptyCabinetRole = "AGENT" | "SPECIALIST" | "STORE" | "COMPANY";

export type ClientsEmptyStep = {
  icon: ClientsEmptyIconName;
  title: string;
  note: string;
};

export type ClientsEmptyContent = {
  icon: ClientsEmptyIconName;
  kicker: string;
  title: string;
  lead: string;
  steps: ClientsEmptyStep[];
  primaryCta: { label: string; action: "scan" | "recommend" };
  secondaryCta: { label: string; action: "client-add" };
};

export type ClientsEmptyIconName =
  | "ticket"
  | "users"
  | "scan"
  | "share"
  | "bag"
  | "phone"
  | "user";

const SELLER_ROLES = new Set<ClientsEmptyCabinetRole>(["STORE", "COMPANY"]);

export function clientsEmptyContentForRole(role: ClientsEmptyCabinetRole): ClientsEmptyContent {
  const secondaryCta = { label: "Добавить клиента", action: "client-add" as const };

  if (SELLER_ROLES.has(role)) {
    return {
      icon: "users",
      kicker: "Пока пусто",
      title: "Здесь будут ваши клиенты",
      lead: "Добавьте клиента. Покупки и сертификаты будут видны в его карточке.",
      steps: [
        {
          icon: "user",
          title: "Добавьте клиента вручную",
          note: "Имя и контакты — в RemCard",
        },
        {
          icon: "scan",
          title: "Проверяйте сертификат на кассе",
          note: "QR или код перед продажей",
        },
        {
          icon: "bag",
          title: "Следите за покупками",
          note: "Сумма и статус — в карточке",
        },
      ],
      primaryCta: { label: "Проверить сертификат", action: "scan" },
      secondaryCta,
    };
  }

  return {
    icon: "users",
    kicker: "Пока пусто",
    title: "Здесь появятся ваши клиенты",
    lead: "Добавьте клиента вручную или создайте для него сертификат. Покупки и начисления — в карточке.",
    steps: [
      {
        icon: "ticket",
        title: "Создайте сертификат",
        note: "Партнёр, клиент, условия",
      },
      {
        icon: "share",
        title: "Поделитесь ссылкой",
        note: "Клиент откроет её в телефоне",
      },
      {
        icon: "bag",
        title: "Следите за покупками",
        note: "Статусы и начисления — в карточке",
      },
    ],
    primaryCta: { label: "Создать сертификат", action: "recommend" },
    secondaryCta,
  };
}

export function mapClientsAccessToEmptyRole(
  accessMode: "agent" | "specialist" | "business",
  businessPartnerType?: "STORE" | "COMPANY",
): ClientsEmptyCabinetRole | null {
  if (accessMode === "agent") return "AGENT";
  if (accessMode === "specialist") return "SPECIALIST";
  if (accessMode === "business" && businessPartnerType === "STORE") return "STORE";
  if (accessMode === "business" && businessPartnerType === "COMPANY") return "COMPANY";
  return null;
}
