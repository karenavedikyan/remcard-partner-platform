import { describe, expect, it } from "vitest";
import { partnersSharedUiCopy } from "./partners-shared-ui-copy";

describe("partnersSharedUiCopy", () => {
  it("uses specialist modal titles from prototype", () => {
    const copy = partnersSharedUiCopy("specialist-r04");
    expect(copy.hubModalTitleFind).toBe("Найти партнёра");
    expect(copy.hubModalTitleLink).toBe("Пригласить партнёра");
  });

  it("keeps agent copy distinct", () => {
    const copy = partnersSharedUiCopy("agent-r04");
    expect(copy.hubModalTitleFind).toBe("Найти партнёра");
    expect(copy.footnote).toMatch(/сотрудников/);
  });

  it("agent overview copy is outgoing-only; business and specialist keep the two-direction wording", () => {
    const agent = partnersSharedUiCopy("agent-r04");
    expect(agent.overviewLead).toMatch(/которым вы рекомендуете клиентов/);
    expect(agent.overviewLead).not.toMatch(/обмениваетесь/);
    expect(agent.activeZoneHint).not.toMatch(/кто рекомендует вас/);
    for (const audience of ["business-store-r04", "business-company-r04", "specialist-r04"] as const) {
      const copy = partnersSharedUiCopy(audience);
      expect(copy.overviewLead).toMatch(/обмениваетесь клиентами/);
      expect(copy.activeZoneHint).toMatch(/кто рекомендует вас/);
    }
  });
});
