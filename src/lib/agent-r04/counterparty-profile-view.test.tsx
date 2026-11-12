import { describe, expect, it } from "vitest";
import { buildCounterpartyProfileView } from "@/lib/partners/build-counterparty-profile-view";
import type { Partnership } from "@/lib/types";

function partnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "p-1",
    status: "ACTIVE",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "2025-03-15T12:00:00.000Z",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [
      {
        id: "t1",
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: "store-internal",
      displayName: "Магазин",
      city: "Казань",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
      organizationName: "ООО Магазин",
      publicId: "RC-TEST-9001",
      description: "Описание для сотрудничества",
      partnershipContact: { name: "Отдел", phone: "+7", email: "a@b.invalid" },
      areas: ["Казань", "Набережные Челны"],
    },
    proUser: {
      id: "agent-1",
      displayName: "Агент",
      city: "Москва",
      specializations: ["painting"],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
      workingNavigatorStageIds: ["L1-9"],
    },
    listPreference: { personalAlias: "Мой агент", archivedAt: null, hiddenAt: null },
    ...overrides,
  };
}

describe("buildCounterpartyProfileView", () => {
  it("shows publicId only when contract field is present", () => {
    const view = buildCounterpartyProfileView(partnership(), "agent-1");
    expect(view.publicId).toBe("RC-TEST-9001");
    const sparse = buildCounterpartyProfileView(
      partnership({
        storeUser: { ...partnership().storeUser, publicId: undefined },
      }),
      "agent-1",
    );
    expect(sparse.publicId).toBeNull();
  });

  it("uses taxonomy labels and neutral copy until enrichment is present on counterparty", () => {
    const storeViewsAgent = buildCounterpartyProfileView(partnership(), "store-1");
    expect(storeViewsAgent.renovationStages).toContain("Чистовая отделка");
    expect(storeViewsAgent.about.mode).toBe("no-contract");
    expect(storeViewsAgent.contact.mode).toBe("no-contract");

    const agentViewsStore = buildCounterpartyProfileView(partnership(), "agent-1");
    expect(agentViewsStore.about.mode).toBe("value");
    expect(agentViewsStore.geography.mode).toBe("value");
    expect(agentViewsStore.contact.mode).toBe("value");
  });

  it("keeps viewer-local personal alias on the counterparty profile", () => {
    const view = buildCounterpartyProfileView(partnership(), "store-1");
    expect(view.personalAliasLine).toBe("Мой агент");
    expect(view.displayName).toBe("Агент");
  });
});
