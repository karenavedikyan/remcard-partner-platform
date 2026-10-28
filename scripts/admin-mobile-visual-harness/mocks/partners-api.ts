export type {
  PartnerRegistryItem,
  PartnerRegistryResponse,
  AdminPartnershipStatusFilter,
} from "../../../src/lib/prof-admin-partners-api";
import { registryRows } from "./fixtures";

export async function fetchPartnerRegistry() {
  return { items: registryRows, total: registryRows.length, nextCursor: null, facets: null };
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
