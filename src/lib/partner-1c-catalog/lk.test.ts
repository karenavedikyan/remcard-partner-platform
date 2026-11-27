import { describe, expect, it } from "vitest";
import { optovikFixtureProducts } from "./fixtures";
import { activeCount, apply, blank, copy, itemsFromProducts, matched } from "./lk";

describe("partner-1c-catalog lk filters", () => {
  const items = itemsFromProducts(optovikFixtureProducts());

  it("AND across facets, OR within one property", () => {
    const st = copy({
      ...blank(),
      facets: { Цвет: ["Белый", "Снежно-белый"], Материал: ["МДФ"] },
    });
    const rows = apply(items, st);
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => {
      const hit = matched(r.item, st);
      expect(hit.length).toBeGreaterThan(0);
      hit.forEach((sku) => {
        expect(sku.props.Материал).toBe("МДФ");
        expect(["Белый", "Снежно-белый"]).toContain(sku.props.Цвет);
      });
    });
  });

  it("search matches model name case-insensitively", () => {
    const st = copy({ ...blank(), q: "mona-58" });
    const rows = apply(items, st);
    expect(rows.some((r) => r.item.id === "p004")).toBe(true);
  });

  it("activeCount ignores sort and search q", () => {
    const st = copy({ ...blank(), q: "test", sort: "name", brand: ["Тандор"] });
    expect(activeCount(st)).toBe(1);
  });

  it("unknown stock is not treated as zero state", () => {
    const orderItem = items.find((i) => i.id === "p006");
    expect(orderItem).toBeTruthy();
    const unknown = orderItem!.skus.filter((k) => k.stock == null);
    expect(unknown.length).toBeGreaterThan(0);
    unknown.forEach((k) => expect(k.state).toBe("unknown"));
  });
});