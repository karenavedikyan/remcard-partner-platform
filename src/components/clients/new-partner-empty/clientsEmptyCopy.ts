import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import {
  ONBOARDING_PARTNER_FIRST_HINT,
  onboardingSettlementsWalletLinkAction,
  onboardingStepAccessibleName,
  resolveOnboardingHistoryLinkAction,
} from "@/lib/onboarding-step/read-only-history";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";

export type ClientsEmptyCopyOptions = {
  /** Pass `true` only when caller proved owner/PRO history access. Default: no `/history` link. */
  canLinkReadOnlyHistory?: boolean;
};

export type ClientsEmptyCabinetRole = "AGENT" | "SPECIALIST" | "STORE" | "COMPANY";

export type ClientsEmptyStep = {
  icon: ClientsEmptyIconName;
  title: string;
  note: string;
  action: OnboardingStepAction;
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

export type ClientsDirectionEmptyStep = {
  icon: ClientsEmptyIconName;
  title: string;
  note: string;
};

export type ClientsDirectionEmptyContent = {
  icon: ClientsEmptyIconName;
  kicker: string;
  title: string;
  lead: string;
  steps: ClientsDirectionEmptyStep[];
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

const SPECIALIST_PURCHASES_STEP_ACTION: OnboardingStepAction = onboardingSettlementsWalletLinkAction(
  "Следите за покупками",
  "Статусы и начисления — в карточке",
);

const CREATE_CERT_WITH_PARTNER_HINT: OnboardingStepAction = {
  kind: "link",
  href: "/certificates/new",
  noteHint: ONBOARDING_PARTNER_FIRST_HINT,
  accessibleName: onboardingStepAccessibleName(
    "Создайте сертификат",
    `Партнёр, клиент, условия. ${ONBOARDING_PARTNER_FIRST_HINT}`,
  ),
};

const SHARE_IN_CREATE_FLOW_HINT: OnboardingStepAction = {
  kind: "link",
  href: "/certificates/new",
  noteHint: "Ссылка появится в мастере создания",
  accessibleName: onboardingStepAccessibleName(
    "Поделитесь ссылкой",
    "Клиент откроет её в телефоне. Ссылка появится в мастере создания",
  ),
};

export function clientsEmptyContentForRole(
  role: ClientsEmptyCabinetRole,
  options?: ClientsEmptyCopyOptions,
): ClientsEmptyContent {
  const canLinkHistory = options?.canLinkReadOnlyHistory;
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
          action: { kind: "button", handler: "onAddClient" },
        },
        {
          icon: "scan",
          title: "Проверяйте сертификат на кассе",
          note: "QR или код перед продажей",
          action: { kind: "link", href: "/scanner" },
        },
        {
          icon: "bag",
          title: "Следите за покупками",
          note: "Сумма и статус — в карточке",
          action: resolveOnboardingHistoryLinkAction(
            "Следите за покупками",
            "Сумма и статус — в карточке",
            canLinkHistory,
          ),
        },
      ],
      primaryCta: { label: "Проверить сертификат", action: "scan" },
      secondaryCta,
    };
  }

  const purchasesStepAction =
    role === "SPECIALIST"
      ? SPECIALIST_PURCHASES_STEP_ACTION
      : resolveOnboardingHistoryLinkAction(
          "Следите за покупками",
          "Статусы и начисления — в карточке",
          canLinkHistory,
        );

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
        action: CREATE_CERT_WITH_PARTNER_HINT,
      },
      {
        icon: "share",
        title: "Поделитесь ссылкой",
        note: "Клиент откроет её в телефоне",
        action: SHARE_IN_CREATE_FLOW_HINT,
      },
      {
        icon: "bag",
        title: "Следите за покупками",
        note: "Статусы и начисления — в карточке",
        action: purchasesStepAction,
      },
    ],
    primaryCta: { label: "Создать сертификат", action: "recommend" },
    secondaryCta,
  };
}

const RECEIVING_WRITABLE: ClientsDirectionEmptyContent = {
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

const RECEIVING_READONLY: ClientsDirectionEmptyContent = {
  ...RECEIVING_WRITABLE,
  lead: "Здесь появятся обращения вашей команды. В режиме просмотра создание и изменение обращений недоступны.",
  foot: "Доступные действия определяются назначенными правами.",
  primaryCta: undefined,
  secondaryCta: undefined,
};

const AT_PARTNERS_WRITABLE: ClientsDirectionEmptyContent = {
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

const AT_PARTNERS_READONLY: ClientsDirectionEmptyContent = {
  ...AT_PARTNERS_WRITABLE,
  primaryCta: undefined,
};

export function clientsEmptyContentForDirection(
  direction: ClientsParityDirection,
  readOnly: boolean,
): ClientsDirectionEmptyContent {
  if (direction === "at-partners") {
    return readOnly ? AT_PARTNERS_READONLY : AT_PARTNERS_WRITABLE;
  }
  return readOnly ? RECEIVING_READONLY : RECEIVING_WRITABLE;
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