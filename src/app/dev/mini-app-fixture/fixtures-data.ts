import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";

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
    role,
    roleLabel: labels[role],
    platform,
    displayName: role === "agent" || role === "specialist" ? entityLine : null,
    entityLine: role === "store" || role === "company" ? entityLine : null,
    cabinetTitle: CABINET_TITLE[role],
    workplaceLabel: role === "store" || role === "company" ? "Центральная точка" : null,
    actions,
    branches: withBranches
      ? [
          { id: "b1", label: "Центральный", active: true },
          { id: "b2", label: "пр. Демо, Казань", active: false },
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

export const MINI_APP_FIXTURES: Record<string, { platform: MiniAppPlatform; bootstrap: MiniAppBootstrap }> = {
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
};