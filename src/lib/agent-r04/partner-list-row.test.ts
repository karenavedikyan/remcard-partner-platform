import { describe, expect, it } from "vitest";
import {
  partnerCollectionListDetail,
  partnerCollectionOfficialLine,
  partnerListDetail,
  partnerListSubtitle,
  partnerRowOfficialLine,
  partnerSpecializationHint,
  partnerTypeLabel,
} from "./partner-list-row";
import type { Partnership } from "@/lib/types";

describe("partner-list-row labels", () => {
  it("renders Russian specialization labels instead of raw ids", () => {
    const hint = partnerSpecializationHint({
      id: "p1",
      displayName: "X",
      storeCategories: ["doors", "flooring"],
      specializations: [],
    } as never);
    expect(hint).toContain("Двери");
    expect(hint).not.toContain("doors");
  });

  it("uses company type in subtitle (detail-dialog caption keeps type · city)", () => {
    const line = partnerListSubtitle({
      id: "p2",
      displayName: "Мастерская",
      partnerType: "COMPANY",
      city: "Краснодар",
      specializations: ["painting"],
      workingServiceSpecializationIds: ["painting"],
    } as never);
    expect(line).toContain("Компания");
    expect(line).toContain("Краснодар");
  });

  it("keeps detail column about city and specs", () => {
    const partnership = {
      id: "ps",
      storeUserId: "store",
      proUserId: "agent",
      storeUser: {
        id: "store",
        displayName: "Дом материалов",
        partnerType: "STORE",
        city: "Краснодар",
        storeCategories: ["doors"],
      },
      proUser: { id: "agent", displayName: "Agent" },
      terms: [{ id: "t1", category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    } as Partnership;
    const detail = partnerListDetail(partnership, "agent");
    expect(detail).toMatch(/Краснодар/);
    expect(detail).toMatch(/Двери/);
  });

  it("shared official helper returns official for any set alias, including alias===official", () => {
    const same = {
      id: "ps-same",
      storeUserId: "store",
      proUserId: "me",
      listPreference: { personalAlias: "Дом материалов", archivedAt: null, hiddenAt: null },
      storeUser: { id: "store", displayName: "Дом материалов", partnerType: "STORE" },
      proUser: { id: "me", displayName: "Me" },
      terms: [],
    } as Partnership;
    expect(partnerRowOfficialLine(same, "me")).toBe("Дом материалов");
    expect(partnerCollectionOfficialLine(same, "me")).toBeNull();

    const none = {
      ...same,
      id: "ps-none",
      listPreference: undefined,
    } as Partnership;
    expect(partnerRowOfficialLine(none, "me")).toBeNull();
    expect(partnerCollectionOfficialLine(none, "me")).toBeNull();
  });

  it("returns official when personal alias differs (shared and collection)", () => {
    const partnership = {
      id: "ps-alias",
      storeUserId: "store",
      proUserId: "me",
      listPreference: { personalAlias: "Мой магазин", archivedAt: null, hiddenAt: null },
      storeUser: {
        id: "store",
        displayName: "ООО Дом",
        organizationName: "ООО Дом",
        partnerType: "STORE",
      },
      proUser: { id: "me", displayName: "Me" },
      terms: [],
    } as Partnership;
    expect(partnerRowOfficialLine(partnership, "me")).toBe("ООО Дом");
    expect(partnerCollectionOfficialLine(partnership, "me")).toBe("ООО Дом");
  });

  it("collection detail keeps both city and specialization fallbacks", () => {
    const bothMissing = {
      id: "ps-empty",
      storeUserId: "store",
      proUserId: "me",
      storeUser: {
        id: "store",
        displayName: "Empty",
        partnerType: "STORE",
        city: "",
        storeCategories: [],
        specializations: [],
      },
      proUser: { id: "me", displayName: "Me" },
      terms: [],
    } as Partnership;
    expect(partnerCollectionListDetail(bothMissing, "me")).toBe(
      "Город не указан · Специализация не указана",
    );
    // Shared export keeps prior semantics (spec-only fallback when both empty).
    expect(partnerListDetail(bothMissing, "me")).toBe("Специализация не указана");

    const cityOnly = {
      ...bothMissing,
      id: "ps-city",
      storeUser: {
        id: "store",
        displayName: "City",
        partnerType: "STORE",
        city: "Сочи",
        storeCategories: [],
        specializations: [],
      },
    } as Partnership;
    expect(partnerCollectionListDetail(cityOnly, "me")).toBe(
      "Сочи · Специализация не указана",
    );
    expect(partnerListDetail(cityOnly, "me")).toBe("Сочи");

    const specOnly = {
      ...bothMissing,
      id: "ps-spec",
      storeUser: {
        id: "store",
        displayName: "Spec",
        partnerType: "STORE",
        city: "",
        storeCategories: ["doors"],
        specializations: [],
      },
    } as Partnership;
    expect(partnerCollectionListDetail(specOnly, "me")).toMatch(/^Город не указан · /);
    expect(partnerCollectionListDetail(specOnly, "me")).toMatch(/Двери/);
    expect(partnerListDetail(specOnly, "me")).toMatch(/Двери/);
    expect(partnerListDetail(specOnly, "me")).not.toMatch(/Город не указан/);
  });

  it("type caption stays company when AGENT activity is mixed with STORE", () => {
    expect(
      partnerTypeLabel({
        id: "co",
        displayName: "Studio",
        partnerType: "COMPANY",
        partnerActivities: ["STORE", "AGENT"],
      } as never),
    ).toBe("Компания");
  });
});
