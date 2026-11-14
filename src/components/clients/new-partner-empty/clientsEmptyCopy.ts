import type { ClientsParityDirection } from "@/lib/clients-parity/types";

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
  foot: string;
  primaryCta?: { label: string; action: "scan" | "recommend" };
  secondaryCta?: { label: string; action: "client-add" };
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

const RECEIVING_WRITABLE: ClientsEmptyContent = {
  icon: "users",
  kicker: "Клиенты у меня",
  title: "Здесь начнётся работа с вашими клиентами",
  lead: "Примите сертификат клиента или добавьте обращение вручную. В одной карточке будут запрос, этапы работы и покупка.",
  steps: [
    { icon: "scan", title: "Зарегистрируйте обращение", note: "По сертификату или вручную" },
    { icon: "users", title: "Работайте с клиентом", note: "Сохраняйте запрос и обновляйте этапы" },
    { icon: "bag", title: "Оформите покупку", note: "В этом же обращении, с возвратом в карточку" },
  ],
  foot: "Обращение появляется до покупки. Покупка и начисления учитываются отдельно.",
  primaryCta: { label: "Сканировать сертификат", action: "scan" },
  secondaryCta: { label: "Добавить клиента", action: "client-add" },
};

const RECEIVING_READONLY: ClientsEmptyContent = {
  ...RECEIVING_WRITABLE,
  lead: "Здесь появятся обращения вашей команды. В режиме просмотра создание и изменение обращений недоступны.",
  foot: "Доступные действия определяются назначенными правами.",
  primaryCta: undefined,
  secondaryCta: undefined,
};

const AT_PARTNERS_WRITABLE: ClientsEmptyContent = {
  icon: "users",
  kicker: "Мои клиенты у партнёров",
  title: "Здесь появятся клиенты, которых вы направили",
  lead: "Создайте сертификат и передайте его клиенту. Когда принимающий партнёр зарегистрирует обращение, здесь появятся его этапы и покупка.",
  steps: [
    { icon: "ticket", title: "Создайте сертификат", note: "Выберите партнёра и условия" },
    { icon: "share", title: "Передайте его клиенту", note: "Клиент покажет QR или код партнёру" },
    { icon: "bag", title: "Следите за обращением", note: "После регистрации у партнёра: этапы и покупка" },
  ],
  foot: "Сам по себе сертификат не создаёт обращение, покупку или начисление.",
  primaryCta: { label: "Создать сертификат", action: "recommend" },
};

const AT_PARTNERS_READONLY: ClientsEmptyContent = {
  ...AT_PARTNERS_WRITABLE,
  primaryCta: undefined,
};

export function clientsEmptyContentForDirection(
  direction: ClientsParityDirection,
  readOnly: boolean,
): ClientsEmptyContent {
  if (direction === "at-partners") {
    return readOnly ? AT_PARTNERS_READONLY : AT_PARTNERS_WRITABLE;
  }
  return readOnly ? RECEIVING_READONLY : RECEIVING_WRITABLE;
}

/** Legacy aggregate role copy (agent-r03 list and tests). */
export function clientsEmptyContentForRole(role: ClientsEmptyCabinetRole): ClientsEmptyContent {
  const secondaryCta = { label: "Добавить клиента", action: "client-add" as const };

  if (SELLER_ROLES.has(role)) {
    return {
      icon: "users",
      kicker: "Пока пусто",
      title: "Клиенты придут с сертификатами",
      lead: "Клиент появляется здесь после первой проверенной покупки.",
      steps: [
        { icon: "phone", title: "Клиент показывает сертификат", note: "QR или код на телефоне" },
        { icon: "scan", title: "Вы проверяете его на кассе", note: "Условия видны сразу" },
        { icon: "bag", title: "Покупка — в карточке клиента", note: "Сумма, бонус и статус" },
      ],
      foot: "Раздел заполнится сам, когда появятся первые данные.",
      primaryCta: { label: "Проверить сертификат", action: "scan" },
      secondaryCta,
    };
  }

  return {
    icon: "users",
    kicker: "Пока пусто",
    title: "Здесь появятся ваши клиенты",
    lead: "Клиент добавляется, когда вы создаёте для него сертификат.",
    steps: [
      { icon: "ticket", title: "Создайте сертификат", note: "Партнёр, клиент, условия" },
      { icon: "share", title: "Поделитесь ссылкой", note: "Клиент откроет её в телефоне" },
      { icon: "bag", title: "Следите за покупками", note: "Статусы и начисления — в карточке" },
    ],
    foot: "Раздел заполнится сам, когда появятся первые данные.",
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

export function defaultClientsIntroDirection(
  accessMode: "agent" | "specialist" | "business",
): ClientsParityDirection {
  return accessMode === "agent" ? "at-partners" : "incoming";
}