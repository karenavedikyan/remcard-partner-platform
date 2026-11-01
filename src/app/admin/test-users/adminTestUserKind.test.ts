import { describe, expect, it } from "vitest";
import {
  filterProfTestUsers,
  nextProfTestUserDisplayName,
  profTestUserCreateKind,
  profTestUserKindLabel,
} from "./adminTestUserKind";

const fourTypes = [
  {
    id: "a1",
    publicId: "RC-TEST-AG",
    displayName: "Тест · Агент",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
    profTestDisabledAt: null,
  },
  {
    id: "m1",
    publicId: "RC-TEST-MS",
    displayName: "Тест · Специалист",
    partnerType: "MASTER",
    partnerActivities: ["SERVICE"],
    profTestDisabledAt: null,
  },
  {
    id: "s1",
    publicId: "RC-TEST-ST",
    displayName: "Тест · Магазин",
    partnerType: "STORE",
    partnerActivities: ["STORE"],
    profTestDisabledAt: null,
  },
  {
    id: "c1",
    publicId: "RC-TEST-CO",
    displayName: "Тест · Компания",
    partnerType: "COMPANY",
    partnerActivities: ["SERVICE"],
    profTestDisabledAt: null,
  },
];

describe("adminTestUserKind", () => {
  it("maps backend partner fields to create kinds (four types)", () => {
    expect(
      profTestUserCreateKind({ partnerType: "COMPANY", partnerActivities: ["AGENT"] }),
    ).toBe("agent");
    expect(profTestUserCreateKind({ partnerType: "MASTER", partnerActivities: ["SERVICE"] })).toBe(
      "master",
    );
    expect(profTestUserCreateKind({ partnerType: "STORE", partnerActivities: ["STORE"] })).toBe("store");
    expect(profTestUserCreateKind({ partnerType: "COMPANY", partnerActivities: ["SERVICE"] })).toBe(
      "company",
    );
  });

  it("labels company vs master when both use SERVICE activity", () => {
    expect(
      profTestUserKindLabel({ partnerType: "MASTER", partnerActivities: ["SERVICE"] }),
    ).toBe("Специалист");
    expect(
      profTestUserKindLabel({ partnerType: "COMPANY", partnerActivities: ["SERVICE"] }),
    ).toBe("Компания");
  });

  it("TEST-USERS-kind-filter: company filter hides master with shared SERVICE activity", () => {
    const filtered = filterProfTestUsers(fourTypes, {
      query: "",
      stateFilter: "all",
      kindFilter: "company",
    });
    expect(filtered.map((i) => i.publicId)).toEqual(["RC-TEST-CO"]);
  });

  it("TEST-USERS-kind-filter: all four kinds selectable independently", () => {
    for (const kind of ["agent", "master", "store", "company"] as const) {
      const filtered = filterProfTestUsers(fourTypes, {
        query: "",
        stateFilter: "all",
        kindFilter: kind,
      });
      expect(filtered).toHaveLength(1);
      expect(profTestUserCreateKind(filtered[0]!)).toBe(kind);
    }
  });
});
