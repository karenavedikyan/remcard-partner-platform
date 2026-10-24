import { describe, expect, it } from "vitest";
import {
  buildModerationOrgCatalogPreviewInput,
  moderationOrgChangeBlock,
  moderationOrgPublicVisibility,
  moderationSubmittedCategoryLabels,
  type ModerationOrgDetail,
} from "@/lib/prof-admin-moderation-org-display";
import { buildCatalogPreviewModel } from "@/lib/catalog-public-preview";

function baseOrg(over: Partial<ModerationOrgDetail> = {}): ModerationOrgDetail {
  return {
    id: "org1",
    name: "Тест Организация",
    partnerType: "COMPANY",
    catalogStatus: "PENDING",
    catalogPublished: false,
    ownerId: "u1",
    ownerPublicId: "pub-u1",
    isTestPartner: false,
    profTestPublicCatalogAllowed: null,
    pendingBranchesCount: 0,
    hasSubmittedDiff: false,
    revisionToken: "rev",
    submitted: {
      description: "Новое описание",
      storeCategories: ["wallpaper"],
      specializations: ["plumbing"],
      navigatorStageIds: ["L1-9"],
      publicPhone: "+79991234567",
    },
    live: {
      description: null,
      catalogPublished: false,
      storeCategories: [],
      specializations: [],
    },
    publicContacts: [],
    branches: [
      {
        id: "b1",
        catalogStatus: "PENDING",
        submitted: { name: "Филиал", city: "Краснодар", address: "ул. Тест 1" },
        hasSubmittedDiff: false,
      },
    ],
    ...over,
  };
}

describe("moderationOrgPublicVisibility", () => {
  it("first publication without live", () => {
    const v = moderationOrgPublicVisibility(baseOrg());
    expect(v.headline).toBe("Ещё не опубликована");
  });

  it("test hidden when opt-in false", () => {
    const v = moderationOrgPublicVisibility(
      baseOrg({ isTestPartner: true, profTestPublicCatalogAllowed: false }),
    );
    expect(v.headline).toBe("Скрыта");
  });

  it("resubmit with live published", () => {
    const v = moderationOrgPublicVisibility(
      baseOrg({ live: { catalogPublished: true, description: "old" } }),
    );
    expect(v.headline).toBe("Опубликована прежняя версия");
  });
});

describe("moderationOrgChangeBlock", () => {
  it("first submission message", () => {
    const block = moderationOrgChangeBlock(baseOrg());
    expect(block.mode).toBe("first");
    expect(block.title).toContain("Новая заявка");
  });

  it("resubmit diff includes logo change", () => {
    const block = moderationOrgChangeBlock(
      baseOrg({
        hasSubmittedDiff: true,
        live: { catalogPublished: true, logoUrl: "https://old/logo.png" },
        submitted: { logoUrl: "https://new/logo.png" },
      }),
    );
    expect(block.lines.some((l) => l.includes("Логотип"))).toBe(true);
  });

  it("resubmit diff includes removed description", () => {
    const block = moderationOrgChangeBlock(
      baseOrg({
        hasSubmittedDiff: true,
        live: {
          catalogPublished: true,
          description: "Было",
          storeCategories: [{ key: "a", label: "A" }],
          specializations: [],
        },
        submitted: {
          description: "",
          storeCategories: [],
          specializations: [],
        },
      }),
    );
    expect(block.mode).toBe("resubmit");
    expect(block.lines.some((l) => l.includes("удалено"))).toBe(true);
  });
});

describe("catalog preview from submitted revision", () => {
  it("uses submitted labels not raw ids", () => {
    const org = baseOrg();
    const { profile, draft } = buildModerationOrgCatalogPreviewInput(org);
    const model = buildCatalogPreviewModel(profile, draft);
    expect(model.productLabels.length).toBeGreaterThan(0);
    expect(model.productLabels[0]).not.toBe("wallpaper");
    expect(moderationSubmittedCategoryLabels(["wallpaper"])[0]).not.toBe("wallpaper");
  });
});

