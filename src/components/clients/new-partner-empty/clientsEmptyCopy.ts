import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import {
  ONBOARDING_PARTNER_FIRST_HINT,
  onboardingSettlementsWalletLinkAction,
  onboardingStepAccessibleName,
  resolveOnboardingHistoryLinkAction,
} from "@/lib/onboarding-step/read-only-history";

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
