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
});
