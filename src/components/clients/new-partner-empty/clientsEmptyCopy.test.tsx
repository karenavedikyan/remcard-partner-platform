import { describe, expect, it } from "vitest";
import {
  clientsEmptyContentForDirection,
  clientsEmptyContentForRole,
  mapClientsAccessToEmptyRole,
} from "./clientsEmptyCopy";

describe("clients empty copy", () => {
  it("maps supported cabinet modes to four roles", () => {
    expect(mapClientsAccessToEmptyRole("agent")).toBe("AGENT");
    expect(mapClientsAccessToEmptyRole("specialist")).toBe("SPECIALIST");
    expect(mapClientsAccessToEmptyRole("business", "STORE")).toBe("STORE");
    expect(mapClientsAccessToEmptyRole("business", "COMPANY")).toBe("COMPANY");
    expect(mapClientsAccessToEmptyRole("business")).toBeNull();
  });

  it("direction incoming writable matches prototype", () => {
    const copy = clientsEmptyContentForDirection("incoming", false);
    expect(copy.kicker).toBe("Клиенты у меня");
    expect(copy.title).toBe("Здесь начнётся работа с вашими клиентами");
    expect(copy.primaryCta?.label).toBe("Сканировать сертификат");
    expect(copy.secondaryCta?.label).toBe("Добавить клиента");
    expect(copy.foot).toContain("Обращение появляется до покупки");
  });

  it("direction at-partners has certificate CTA only", () => {
    const copy = clientsEmptyContentForDirection("at-partners", false);
    expect(copy.kicker).toBe("Мои клиенты у партнёров");
    expect(copy.primaryCta?.action).toBe("recommend");
    expect(copy.secondaryCta).toBeUndefined();
    expect(copy.foot).toContain("Сам по себе сертификат");
  });

  it("read-only incoming strips mutation CTAs", () => {
    const copy = clientsEmptyContentForDirection("incoming", true);
    expect(copy.primaryCta).toBeUndefined();
    expect(copy.secondaryCta).toBeUndefined();
    expect(copy.lead).toContain("режиме просмотра");
  });

  it("legacy seller role copy keeps scan primary", () => {
    for (const role of ["STORE", "COMPANY"] as const) {
      const copy = clientsEmptyContentForRole(role);
      expect(copy.primaryCta?.action).toBe("scan");
    }
  });

  it("legacy recommender role copy", () => {
    for (const role of ["AGENT", "SPECIALIST"] as const) {
      const copy = clientsEmptyContentForRole(role);
      expect(copy.primaryCta?.action).toBe("recommend");
      expect(copy.secondaryCta?.label).toBe("Добавить клиента");
    }
  });
});