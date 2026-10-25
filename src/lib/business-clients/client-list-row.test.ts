import { describe, expect, it } from "vitest";
import { clientRowDetail } from "@/lib/agent-r03/clientListRow";
import type { AgentClientRow } from "@/lib/agent-r03/types";

const base: AgentClientRow = {
  id: "c1",
  displayName: "Test",
  phone: null,
  email: null,
  city: "Краснодар",
  need: null,
  note: null,
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  certificateCount: 0,
  hasPurchases: false,
};

describe("business clients list copy", () => {
  it("does not show agent bonus placeholder", () => {
    expect(clientRowDetail(base, "business")).toBe("Пока без сертификатов");
    expect(clientRowDetail({ ...base, certificateCount: 2 }, "business")).toBe("2 сертификата");
    expect(clientRowDetail(base, "business")).not.toMatch(/бонус|АГЕНТ/i);
  });
});
