import { describe, expect, it } from "vitest";
import {
  clientPurchaseStatusLabel,
  clientRowCaption,
  clientRowDetail,
  clientRowMobileMeta,
  clientRowMobileSubtitle,
} from "./clientListRow";
import type { AgentClientRow } from "./types";

const base: AgentClientRow = {
  id: "1",
  displayName: "Test",
  phone: null,
  email: null,
  city: "Краснодар",
  need: "Задача parity",
  note: "Внутренняя заметка",
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
  certificateCount: 2,
  hasPurchases: false,
};

describe("clientListRow", () => {
  it("agent mode uses note for caption and bonus in details", () => {
    expect(clientRowCaption(base, "agent")).toBe("Внутренняя заметка");
    expect(clientRowDetail(base, "agent")).toBe("2 сертификата · бонус —");
    expect(clientRowMobileSubtitle(base, "agent")).toBe("Краснодар · Внутренняя заметка");
  });

  it("legacy agent client keeps note when need is null", () => {
    const legacy = { ...base, need: null, note: "Legacy task", city: "Москва" };
    expect(clientRowCaption(legacy, "agent")).toBe("Legacy task");
    expect(clientRowMobileSubtitle(legacy, "agent")).toBe("Москва · Legacy task");
  });

  it("specialist mode uses cert count caption and city·task detail", () => {
    expect(clientRowCaption(base, "specialist")).toBe("2 сертификата");
    expect(clientRowDetail(base, "specialist")).toBe("Краснодар · Задача parity");
    expect(clientRowMobileSubtitle(base, "specialist")).toBe("Краснодар · Задача parity");
    expect(clientRowMobileMeta(base, "specialist")).toBe("2 сертификата");
  });

  it("specialist empty task uses fallback in detail", () => {
    const emptyNeed = { ...base, need: null };
    expect(clientRowDetail(emptyNeed, "specialist")).toBe("Краснодар");
  });

  it("uses purchase status labels from hasPurchases", () => {
    expect(clientPurchaseStatusLabel({ ...base, hasPurchases: true }, false)).toBe(
      "Есть покупки",
    );
    expect(clientPurchaseStatusLabel({ ...base, hasPurchases: false }, false)).toBe(
      "Пока без покупок",
    );
  });
});
