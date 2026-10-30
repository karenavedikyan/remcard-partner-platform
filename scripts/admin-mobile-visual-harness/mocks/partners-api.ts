export type {
  PartnerRegistryItem,
  PartnerRegistryResponse,
  AdminPartnershipStatusFilter,
} from "../../../src/lib/prof-admin-partners-api";
import { registryRows } from "./fixtures";

export async function fetchPartnerRegistry(params?: URLSearchParams) {
  let items = [...registryRows];
  const registration = params?.get("registration");
  if (registration === "active") {
    items = items.filter((row) => row.registrationLabel === "LIVE");
  } else if (registration === "demo") {
    items = items.filter((row) => row.registrationLabel === "DEMO");
  }
  const partnerType = params?.get("partnerType");
  if (partnerType) items = items.filter((row) => row.partnerType === partnerType);
  const q = params?.get("q")?.trim().toLowerCase();
  if (q) items = items.filter((row) => (row.displayName ?? "").toLowerCase().includes(q));
  const limit = Math.min(Number(params?.get("limit") ?? "25") || 25, 100);
  const total = items.length;
  return {
    items: items.slice(0, limit),
    total,
    nextCursor: total > limit ? "page-2" : null,
    facets: {
      matchedTotal: total,
      partnerKind: {
        all: total,
        agent: items.filter((r) => r.partnerKind === "agent").length,
        specialist: items.filter((r) => r.partnerKind === "specialist").length,
        store: items.filter((r) => r.partnerKind === "store").length,
        company: items.filter((r) => r.partnerKind === "company").length,
        unknown: 0,
        facetRule: "harness",
      },
      registration: {
        active: items.filter((r) => r.registrationLabel === "LIVE").length,
        demo: items.filter((r) => r.registrationLabel === "DEMO").length,
        facetRule: "harness",
      },
      catalog: { visible: total, hidden: 0, notPublic: 0, facetRule: "harness" },
      archive: { archived: 0, notArchived: total, facetRule: "harness" },
    },
  };
}

export async function fetchAdminPartnerPartnerships(
  _partnerUserId: string,
  _params: { status: string; cursor?: string | null; limit?: number },
) {
  return {
    items: [
      {
        id: "ps-harness",
        status: "ACTIVE",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-02T12:00:00.000Z",
        partner: {
          id: "counter-long",
          publicId: "RC-LONG-C",
          displayName:
            "Контрагент с очень длинным отображаемым именем для проверки горизонтального скролла таблицы",
          partnerKind: "specialist" as const,
          city: "Санкт-Петербург",
        },
      },
    ],
    total: 1,
    nextCursor: null,
  };
}

export async function previewPartnerLifecycle(_userId: string, _action: string) {
  return {
    preview: {
      effects: ["Карточка будет скрыта из поиска"],
      warnings: [],
      confirmToken: "harness-preview-token",
    },
  };
}

export async function applyPartnerLifecycle() {
  return { ok: true };
}

export async function previewDemoSupersession() {
  return { preview: { effects: [], warnings: [], confirmToken: "demo-token" } };
}

export async function applyDemoSupersession() {
  return { ok: true };
}
