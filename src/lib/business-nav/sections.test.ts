import { describe, expect, it } from "vitest";
import {
  BUSINESS_MOBILE_BOTTOM,
  businessNavMoreItems,
  businessPageTitleWithSection,
  COMPANY_DESKTOP_NAV,
  STORE_DESKTOP_NAV,
} from "./sections";

describe("business nav sections", () => {
  it("lists store owner menu in prototype order", () => {
    expect(STORE_DESKTOP_NAV.map((i) => i.label)).toEqual([
      "Главная",
      "Клиенты",
      "Сертификаты",
      "Сканер",
      "Каталог",
      "Калькулятор дверей",
      "Партнёры",
      "Кошелёк",
      "Профиль",
    ]);
  });

  it("inserts employees between wallet and profile for company", () => {
    expect(COMPANY_DESKTOP_NAV.map((i) => i.label)).toEqual([
      "Главная",
      "Клиенты",
      "Сертификаты",
      "Сканер",
      "Каталог",
      "Калькулятор дверей",
      "Партнёры",
      "Кошелёк",
      "Сотрудники",
      "Профиль",
    ]);
    expect(COMPANY_DESKTOP_NAV[8]?.href).toBe("/profile?section=team");
  });

  it("mirrors master mobile bottom and more sheet targets", () => {
    expect(BUSINESS_MOBILE_BOTTOM.map((i) => i.label)).toEqual([
      "Главная",
      "Сканер",
      "Кошелёк",
      "Профиль",
    ]);
    expect(businessNavMoreItems(COMPANY_DESKTOP_NAV).map((i) => i.label)).toEqual([
      "Клиенты",
      "Сертификаты",
      "Каталог",
      "Калькулятор дверей",
      "Партнёры",
      "Сотрудники",
    ]);
  });

  it("titles team deep link as Сотрудники", () => {
    expect(businessPageTitleWithSection("/profile", "team", COMPANY_DESKTOP_NAV)).toBe(
      "Сотрудники",
    );
    expect(businessPageTitleWithSection("/recommendations", null, STORE_DESKTOP_NAV)).toBe(
      "Сертификаты",
    );
  });
});
