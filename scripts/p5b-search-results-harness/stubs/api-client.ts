export class RemcardApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Scene = "results" | "long" | "empty" | "error" | "loading";

function scene(): Scene {
  const raw = new URLSearchParams(window.location.search).get("scene") || "results";
  if (raw === "long" || raw === "empty" || raw === "error" || raw === "loading") return raw;
  return "results";
}

const basePartner = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  displayName: `Партнёр ${id}`,
  city: "Краснодар",
  photoUrl: null,
  description: null,
  specializations: [],
  badges: [],
  storeCategories: [],
  branches: [],
  rating: null,
  ratingCount: 0,
  partnershipStatus: null,
  partnerType: "STORE",
  partnerTypeLabel: "Магазин",
  workingProductLabels: ["Двери", "Фурнитура"],
  workingServiceLabels: [],
  workingStageLabels: ["Чистовая отделка"],
  ...overrides,
});

function partnersForScene(s: Scene) {
  if (s === "empty" || s === "error" || s === "loading") return [];
  if (s === "long") {
    return [
      basePartner("long-1", {
        displayName:
          "Очень длинное название магазина освещения электротехники и комплектующих для ремонта без обрезания на узком экране",
        city: "Краснодарский край, станица Динская, улица Красная длинный хвост адреса",
        partnerType: "COMPANY",
        partnerTypeLabel: "Компания",
        workingProductLabels: [
          "Светильники потолочные встраиваемые длинная подпись направления",
          "Кабель и проводка",
          "Розетки и выключатели премиум",
        ],
        workingStageLabels: ["Электромонтажные работы длинный этап"],
      }),
      basePartner("long-2", {
        displayName: "Мастер по плитке с исключительно длинным отображаемым именем профиля",
        city: "Сочи",
        partnerType: "MASTER",
        partnerTypeLabel: "Специалист",
        workingProductLabels: [],
        workingServiceLabels: ["Укладка плитки", "Гидроизоляция"],
        partnershipStatus: "ACTIVE",
      }),
    ];
  }
  return [
    basePartner("s1"),
    basePartner("s2", {
      displayName: "Компания ЮгСтрой",
      partnerType: "COMPANY",
      partnerTypeLabel: "Компания",
      workingProductLabels: ["Сантехника"],
      city: "Москва",
    }),
    basePartner("s3", {
      displayName: "Иван Специалист",
      partnerType: "MASTER",
      partnerTypeLabel: "Специалист",
      workingProductLabels: [],
      workingServiceLabels: ["Электромонтаж", "Слаботочка"],
      city: "Сочи",
    }),
    basePartner("s4", {
      displayName: "Двери Кубань",
      partnershipStatus: "PENDING",
    }),
    ...Array.from({ length: 10 }, (_, i) =>
      basePartner(`extra-${i + 1}`, {
        displayName: `Доп. партнёр ${i + 1}`,
        city: i % 2 ? "Краснодар" : "Ростов-на-Дону",
      }),
    ),
  ];
}

export async function remcardFetch(path: string) {
  const s = scene();
  if (path === "/api/partnership/list") return { partnerships: [] };
  if (path === "/api/partnership/link-invite") return { invites: [] };
  if (path === "/api/pro/profile") {
    return {
      organization: null,
      programs: [],
      user: {
        id: "agent-harness",
        publicId: "RC-H",
        displayName: "Agent Harness",
        city: "Краснодар",
        specializations: [],
        role: "PRO",
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
        description: null,
        catalogStatus: "APPROVED",
        isPublic: true,
        rejectionReason: null,
        badges: [],
        photoUrl: null,
        storeCategories: [],
        areas: [],
        website: null,
        telegram: null,
        whatsapp: null,
        instagram: null,
        vk: null,
        max: null,
        yandex: null,
        publicEmail: null,
        publicPhone: null,
        showFullName: false,
      },
    };
  }
  if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
    if (s === "loading") {
      await new Promise(() => {});
    }
    if (s === "error") {
      throw new RemcardApiError(500, "Сервер недоступен (synthetic)");
    }
    const partners = partnersForScene(s);
    return {
      partners,
      nextCursor: s === "results" ? "more-cursor" : null,
      hasMore: s === "results",
    };
  }
  if (typeof path === "string" && path.includes("/general-terms")) {
    return { terms: [] };
  }
  throw new Error(`fail-closed harness: unexpected ${path}`);
}
