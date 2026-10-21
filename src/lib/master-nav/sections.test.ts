import { describe, expect, it } from "vitest";
import {
  MASTER_DESKTOP_NAV,
  MASTER_MOBILE_BOTTOM,
  masterNavMoreItems,
  masterPageTitle,
} from "./sections";

describe("MASTER nav sections", () => {
  it("lists seven desktop items in prototype order", () => {
    expect(MASTER_DESKTOP_NAV.map((i) => i.label)).toEqual([
      "Главная",
      "Клиенты",
      "Сертификаты",
      "Сканер",
      "Партнёры",
      "Кошелёк",
      "Профиль",
    ]);
    expect(MASTER_DESKTOP_NAV).toHaveLength(7);
  });

  it("exposes mobile bottom without duplicate more targets", () => {
    expect(MASTER_MOBILE_BOTTOM.map((i) => i.label)).toEqual([
      "Главная",
      "Сканер",
      "Кошелёк",
      "Профиль",
    ]);
    const bottomHrefs = new Set(MASTER_MOBILE_BOTTOM.map((i) => i.href));
    for (const item of masterNavMoreItems()) {
      expect(bottomHrefs.has(item.href)).toBe(false);
    }
    expect(masterNavMoreItems().map((i) => i.label)).toEqual([
      "Клиенты",
      "Сертификаты",
      "Партнёры",
    ]);
  });

  it("titles certificates route as Сертификаты", () => {
    expect(masterPageTitle("/recommendations")).toBe("Сертификаты");
    expect(masterPageTitle("/recommendations/new")).toBe("Сертификаты");
  });

  it("maps Кошелёk to wallet icon while href stays settlements", () => {
    const walletItems = [...MASTER_DESKTOP_NAV, ...MASTER_MOBILE_BOTTOM].filter(
      (i) => i.label === "Кошелёк",
    );
    expect(walletItems).toHaveLength(2);
    for (const item of walletItems) {
      expect(item.href).toBe("/settlements");
      expect(item.icon).toBe("wallet");
    }
  });
});
