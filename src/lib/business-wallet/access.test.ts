import { describe, expect, it } from "vitest";
import { businessWalletLedgerScopeKey, canManageBusinessWalletRequisites } from "./access";

describe("businessWalletLedgerScopeKey", () => {
  it("never embeds organization owner id — only actor session id", () => {
    expect(
      businessWalletLedgerScopeKey({
        actorUserId: "employee-session",
        organizationId: "org-99",
        partnerType: "STORE",
      }),
    ).toBe("STORE:org-99:employee-session");
  });
});

describe("canManageBusinessWalletRequisites", () => {
  it("allows PRO org owner only", () => {
    expect(
      canManageBusinessWalletRequisites({
        user: { role: "PRO" },
        proContext: { role: "ORG_OWNER" },
      }),
    ).toBe(true);
  });

  it("blocks CLIENT org employee", () => {
    expect(
      canManageBusinessWalletRequisites({
        user: { role: "CLIENT" },
        proContext: { role: "ORG_EMPLOYEE" },
      }),
    ).toBe(false);
  });
});
