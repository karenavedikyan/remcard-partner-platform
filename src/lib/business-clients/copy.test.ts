import { describe, expect, it } from "vitest";
import { clientsListPageCopy } from "./copy";

describe("clientsListPageCopy", () => {
  it("uses one short receiving subtitle for store, company and specialist", () => {
    const store = clientsListPageCopy({ mode: "business", partnerType: "STORE", direction: "incoming" });
    const company = clientsListPageCopy({ mode: "business", partnerType: "COMPANY", direction: "incoming" });
    const specialist = clientsListPageCopy({ mode: "specialist", direction: "incoming" });
    expect(store).toMatchObject({ eyebrow: "Магазин", title: "Клиенты" });
    expect(company.eyebrow).toBe("Компания");
    expect(specialist.eyebrow).toBe("Специалист");
    for (const c of [store, company, specialist]) {
      expect(c.description).toBe("Покупатели вашего магазина и история их обращений.");
      expect(c.description).not.toContain("не отправляются партнёрам");
    }
  });

  it("describes the direction of referred clients and the agent page with one title", () => {
    const at = clientsListPageCopy({ mode: "specialist", direction: "at-partners" });
    expect(at.title).toBe("Мои клиенты у партнёров");
    expect(at.description).toBe("Направленные клиенты и этапы их обращений у принимающих партнёров.");
    const agent = clientsListPageCopy({ mode: "agent", direction: "incoming" });
    expect(agent).toMatchObject({ eyebrow: "Агент", title: "Мои клиенты у партнёров", description: at.description });
  });
});
