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

  it("routes specialist purchases step to settlements; agent to history when allowed", () => {
    const agentBag = clientsEmptyContentForRole("AGENT", { canLinkReadOnlyHistory: true }).steps.find(
      (s) => s.title === "Следите за покупками",
    );
    const specialistBag = clientsEmptyContentForRole("SPECIALIST").steps.find(
      (s) => s.title === "Следите за покупками",
    );
    expect(agentBag?.action).toMatchObject({ kind: "link", href: "/history" });
    expect(specialistBag?.action).toMatchObject({ kind: "link", href: "/settlements" });
    if (specialistBag?.action.kind === "link") {
      expect(specialistBag.action.noteHint).toBe("Начисления и выплаты — в кошельке");
      expect(specialistBag.action.accessibleName).toContain("Открыть кошелёк");
    }
  });

  it("static purchases step when history capability is not granted", () => {
    const step = clientsEmptyContentForRole("STORE").steps.find(
      (s) => s.title === "Следите за покупками",
    );
    expect(step?.action.kind).toBe("none");
  });
});
