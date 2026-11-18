import { describe, expect, it } from "vitest";
import {
  buildProfileSectionHref,
  profileSectionNav,
  resolveProfileSectionFromQuery,
  withPartnerSectionLabels,
} from "./profile-sections";

describe("profile-sections: основная точка и дополнительные адреса", () => {
  it("раздел branches в навигации называется «Точки», id и маршрут не меняются", () => {
    const entry = profileSectionNav().find((item) => item.id === "branches");
    expect(entry?.label).toBe("Точки");
    expect(profileSectionNav().some((item) => item.label === "Филиалы")).toBe(false);
    expect(resolveProfileSectionFromQuery({ section: "branches" })).toBe("branches");
    expect(resolveProfileSectionFromQuery({ branchId: "br_1" })).toBe("branches");
    expect(buildProfileSectionHref("branches", new URLSearchParams()).includes("section=branches")).toBe(true);
  });

  it("остальные подписи навигации не затронуты", () => {
    expect(profileSectionNav().map((item) => item.label)).toEqual([
      "Обзор",
      "Основные данные",
      "Каталог RemCard",
      "Точки",
      "Сотрудники",
      "Уведомления",
    ]);
  });

  it("у компании вкладка branches называется «Филиалы», id и порядок прежние; магазин и специалист не меняются", () => {
    const company = withPartnerSectionLabels(profileSectionNav(), "COMPANY");
    expect(company.map((item) => item.id)).toEqual(profileSectionNav().map((item) => item.id));
    expect(company.find((item) => item.id === "branches")?.label).toBe("Филиалы");
    expect(company.filter((item) => item.id !== "branches")).toEqual(
      profileSectionNav().filter((item) => item.id !== "branches"),
    );
    for (const other of ["STORE", "MASTER", null, undefined]) {
      expect(withPartnerSectionLabels(profileSectionNav(), other).find((item) => item.id === "branches")?.label).toBe("Точки");
    }
    expect(profileSectionNav().find((item) => item.id === "branches")?.label).toBe("Точки");
  });
});
