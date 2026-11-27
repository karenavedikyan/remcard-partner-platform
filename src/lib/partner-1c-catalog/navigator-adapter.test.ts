import { describe, expect, it } from "vitest";
import {
  adaptNavigatorCabinetList,
  fixtureNavigatorCabinetListSample,
} from "./navigator-adapter";
import { fixtureOptovikOwnerProContext } from "@/lib/employee-workspace-data/fixtures";
describe("navigator cabinet adapter", () => {
  it("maps sample list into UI models and publication hidden set", () => {
    const sample = fixtureNavigatorCabinetListSample();
    const snap = adaptNavigatorCabinetList(sample, {
      proContext: fixtureOptovikOwnerProContext(),
      access: { enabled: true, canAccess: true, isOwner: true },
    });
    expect(snap.models.length).toBe(sample.models.length);
    expect(snap.priceType).toBe("РРЦ Тандор");
    expect(snap.manage).toBe(true);
    const p004 = snap.models.find((m) => m.id === "p004");
    expect(p004?.price).toBe(11670);
    expect(p004?.cost).toBe(6520);
    expect(snap.publication.hidden.has("p010")).toBe(true);
    expect(snap.source).toBe("navigator");
  });

  it("strips owner economics for staff adapter path", () => {
    const sample = fixtureNavigatorCabinetListSample();
    sample.meta.isOwner = false;
    const snap = adaptNavigatorCabinetList(sample, {
      proContext: null,
      access: { enabled: true, canAccess: true, isOwner: false },
    });
    expect(snap.models.every((m) => m.cost == null)).toBe(true);
    expect(snap.manage).toBe(false);
  });
});