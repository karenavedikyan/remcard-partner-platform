import type { StoreCertificate } from "@/lib/certificate-types";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import { MINI_WALLET_EMPTY_FIXTURE } from "@/lib/mini-app/wallet/fixtures";
import type { SettlementsResponse } from "@/lib/settlements-types";

/** Synthetic certificate for dev flow screenshots only — not proof of live create. */
const FIXTURE_CERT_QR_LOOKUP = "qr-fixture-dev-inert";

export const MINI_APP_FIXTURE_CREATED_CERTIFICATE: StoreCertificate = {
  id: "fixture-cert-1",
  promoCode: "RC-FIXTURE",
  qrCode: FIXTURE_CERT_QR_LOOKUP,
  certificateUrl: `https://remcard.ru/certificate/${encodeURIComponent(FIXTURE_CERT_QR_LOOKUP)}`,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  discountPercent: 10,
  usageCount: 0,
  maxUsages: 1,
  validUntil: null,
  partners: [
    {
      id: "p1",
      storeUserId: "store-fixture",
      storeName: "RemCard Showcase",
      partnershipId: "ps-fixture",
      isSelfScan: false,
      categories: [{ category: "doors", categoryLabel: "Двери и входные группы", discountPercent: 10 }],
    },
  ],
  clientUser: { id: "cl-fixture", displayName: "Анна Клиентова" },
};

/** Dev-only labels for create-flow screenshots — not loaded from live APIs. */
export const MINI_APP_FIXTURE_CREATE_SEED = {
  programLabel: "Двери и входные группы",
  clientLabel: "Анна Клиентова",
};

/** Dev-only invite URL for flow screenshots — not a live invite. */
export const MINI_APP_FIXTURE_INVITE_LINK =
  "https://prof.remcard.ru/invite/dev-fixture-demo-link-not-a-live-token";

const CABINET_TITLE: Record<MiniAppBootstrap["role"], string> = {
  agent: "Кабинет агента",
  specialist: "Кабинет специалиста",
  store: "Кабинет магазина",
  company: "Кабинет компании",
};

export function buildMiniAppFixture(
  role: MiniAppBootstrap["role"],
  platform: MiniAppPlatform,
  caps: { canCreate: boolean; canScan: boolean },
  withBranches = false,
): MiniAppBootstrap {
  const labels = { agent: "Агент", specialist: "Специалист", store: "Магазин", company: "Компания" };
  const actions: MiniAppBootstrap["actions"] = [];
  if (role === "agent" && caps.canCreate) {
    actions.push({ id: "create_certificate", label: "Создать сертификат", prominence: "primary" });
  } else if (role === "specialist") {
    if (caps.canCreate) actions.push({ id: "create_certificate", label: "Создать сертификат", prominence: "primary" });
    if (caps.canScan) actions.push({ id: "scan_qr", label: "Сканировать QR", prominence: "secondary" });
  } else {
    if (caps.canScan) actions.push({ id: "scan_qr", label: "Сканировать QR", prominence: "primary" });
    if (caps.canCreate) actions.push({ id: "create_certificate", label: "Создать сертификат", prominence: "secondary" });
  }
  actions.push(
    { id: "invite_partner", label: "Пригласить партнёра", prominence: "tertiary" },
    { id: "open_full_cabinet", label: "Открыть полный кабинет", prominence: "tertiary" },
  );
  const entityLine =
    role === "store"
      ? "Магазин «Маяк»"
      : role === "company"
        ? "Компания «Формат»"
        : role === "agent"
          ? "Алексей Романов"
          : "Мария Орлова";
  return {
    actorUserId: `fixture-${role}`,
    role,
    roleLabel: labels[role],
    platform,
    displayName: role === "agent" || role === "specialist" ? entityLine : null,
    entityLine: role === "store" || role === "company" ? entityLine : null,
    cabinetTitle: CABINET_TITLE[role],
    workplaceLabel: role === "store" || role === "company" ? "Центральная точка" : null,
    actions,
    canChooseWalletBranches: withBranches && (role === "store" || role === "company"),
    branches: withBranches
      ? [
          { id: "b1", label: "Центральный", active: true },
          { id: "b2", label: "пр. Демо, Казань", active: false },
          { id: "b3", label: "Северный", active: false },
        ]
      : [],
    activeBranchId: withBranches ? "b1" : null,
    workplaceForbidden: false,
    workplaceForbiddenMessage: null,
    wallet: {
      status: "ok",
      confirmedUnpaidRub: 12_480,
      awaitingRub: 3_200,
      loadError: false,
    },
    presentation: {
      cardIdentifier: null,
      historyHref: "/settlements",
      cardExplainer:
        "«Начислено к получению» — подтверждённые суммы. «Ожидает подтверждения» — начисления до подтверждения магазином.",
    },
    fullCabinetUrl: "https://prof.remcard.ru/",
    partnersUrl: "https://prof.remcard.ru/partners",
  };
}

export type MiniAppFixtureRow = {
  platform: MiniAppPlatform;
  bootstrap: MiniAppBootstrap;
  initialScreen?: "wallet" | "home";
  fixtureWalletData?: SettlementsResponse;
};

export const MINI_APP_FIXTURES: Record<string, MiniAppFixtureRow> = {
  "agent-telegram": {
    platform: "telegram",
    bootstrap: buildMiniAppFixture("agent", "telegram", { canCreate: true, canScan: false }),
  },
  "agent-max": {
    platform: "max",
    bootstrap: buildMiniAppFixture("agent", "max", { canCreate: true, canScan: false }),
  },
  "specialist-telegram": {
    platform: "telegram",
    bootstrap: buildMiniAppFixture("specialist", "telegram", { canCreate: true, canScan: true }),
  },
  "specialist-max": {
    platform: "max",
    bootstrap: buildMiniAppFixture("specialist", "max", { canCreate: true, canScan: true }),
  },
  "store-telegram": {
    platform: "telegram",
    bootstrap: buildMiniAppFixture("store", "telegram", { canCreate: true, canScan: true }),
  },
  "store-max": {
    platform: "max",
    bootstrap: buildMiniAppFixture("store", "max", { canCreate: true, canScan: true }),
  },
  "company-telegram": {
    platform: "telegram",
    bootstrap: buildMiniAppFixture("company", "telegram", { canCreate: true, canScan: true }, true),
  },
  "company-max": {
    platform: "max",
    bootstrap: buildMiniAppFixture("company", "max", { canCreate: true, canScan: true }, true),
  },
  "agent-empty-telegram": {
    platform: "telegram",
    bootstrap: buildMiniAppFixture("agent", "telegram", { canCreate: true, canScan: false }),
    initialScreen: "wallet",
    fixtureWalletData: MINI_WALLET_EMPTY_FIXTURE,
  },
  "company-wallet-telegram": {
    platform: "telegram",
    bootstrap: {
      ...buildMiniAppFixture("company", "telegram", { canCreate: true, canScan: true }, true),
      workplaceLabel: "Центральный",
    },
    initialScreen: "wallet",
  },
};
