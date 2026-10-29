import { describe, expect, it } from "vitest";
import { adaptPartnerPrimaryKind } from "./partner-kind-adapter";

describe("adaptPartnerPrimaryKind", () => {
  it("treats pure AGENT activities as agent (Седа-style)", () => {
    expect(
      adaptPartnerPrimaryKind({
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      }),
    ).toBe("agent");
  });

  it("keeps COMPANY + STORE + AGENT as company (ОПТОВИК), not agent", () => {
    expect(
      adaptPartnerPrimaryKind({
        partnerType: "COMPANY",
        partnerActivities: ["STORE", "AGENT"],
      }),
    ).toBe("company");
  });

  it("maps MASTER to specialist and STORE to store", () => {
    expect(
      adaptPartnerPrimaryKind({ partnerType: "MASTER", partnerActivities: ["SERVICE"] }),
    ).toBe("specialist");
    expect(
      adaptPartnerPrimaryKind({ partnerType: "STORE", partnerActivities: ["STORE"] }),
    ).toBe("store");
  });

  it("does not use includes(AGENT) alone as classifier for store/company", () => {
    expect(
      adaptPartnerPrimaryKind({
        partnerType: "STORE",
        partnerActivities: ["STORE", "AGENT"],
      }),
    ).toBe("store");
  });
});
