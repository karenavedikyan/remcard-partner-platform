import { describe, expect, it } from "vitest";
import {
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

  it("uses seller copy with manual-add lead and secondary CTA", () => {
    for (const role of ["STORE", "COMPANY"] as const) {
      const copy = clientsEmptyContentForRole(role);
      expect(copy.lead).toContain("Добавьте клиента");
      expect(copy.secondaryCta.label).toBe("Добавить клиента");
      expect(copy.primaryCta.action).toBe("scan");
    }
  });

  it("uses recommender copy with secondary add for AGENT and SPECIALIST", () => {
    for (const role of ["AGENT", "SPECIALIST"] as const) {
      const copy = clientsEmptyContentForRole(role);
      expect(copy.primaryCta.action).toBe("recommend");
      expect(copy.secondaryCta.label).toBe("Добавить клиента");
    }
  });
});
