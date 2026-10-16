import { describe, expect, it } from "vitest";
import {
  clientPurchaseStatusLabel,
  clientRowCaption,
  clientRowDetail,
  clientRowMobileSubtitle,
} from "./clientListRow";
import type { AgentClientRow } from "./types";

const base: AgentClientRow = {
  id: "1",
  displayName: "Test",
  phone: null,
  email: null,
  city: "Краснодар",
  note: "Задача parity",
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
  certificateCount: 2,
  hasPurchases: false,
};

describe("clientListRow", () => {
  it("puts task under name and cert summary in details", () => {
    expect(clientRowCaption(base)).toBe("Задача parity");
    expect(clientRowDetail(base)).toBe("2 сертификата · бонус —");
  });

  it("formats mobile list subtitle as task · city", () => {
    expect(clientRowMobileSubtitle(base)).toBe("Краснодар · Задача parity");
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
