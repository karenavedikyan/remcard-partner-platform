import { describe, expect, it } from "vitest";
import { homeEmptyCopy } from "./copy";

describe("homeEmptyCopy", () => {
  it("matches approved prototype texts for specialist, store and company", () => {
    const specialist = homeEmptyCopy("specialist");
    expect(specialist.title).toBe("Начните с профиля и партнёров");
    expect(specialist.steps).toHaveLength(3);
    expect(specialist.primaryCta.href).toBe("/profile");
    expect(specialist.secondaryCta?.href).toBe("/partners");

    const store = homeEmptyCopy("store");
    expect(store.title).toBe("Подготовьте магазин к первым клиентам");
    expect(store.steps[2]?.title).toBe("Проверка на кассе");

    const company = homeEmptyCopy("company");
    expect(company.title).toBe("Настройте компанию за три шага");
    expect(company.secondaryCta?.label).toBe("Пригласить сотрудника");
    expect(company.secondaryCta?.href).toBe("/profile?section=team");
  });
});
