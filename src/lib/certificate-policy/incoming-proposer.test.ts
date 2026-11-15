import { describe, expect, it } from "vitest";
import { certificatePolicyIncomingProposalTitle } from "./incoming-proposer";
import type { CertificatePolicyWorkspace } from "./types";

const baseWs = (): CertificatePolicyWorkspace => ({
  general: {
    scope: "general",
    version: 1,
    effective: {
      validityDays: 30,
      purchaseLimit: 1,
      minimumPurchaseAmount: null,
      promotionsCompatible: false,
      exclusionsText: null,
      categoryRates: [],
    },
  },
  counterparties: [
    {
      userId: "p1",
      displayName: "Store Alpha",
      roleLabel: "Магазин",
      initials: "SA",
      status: "general",
      partnershipId: "ps1",
      effective: {
        validityDays: 30,
        purchaseLimit: 1,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        categoryRates: [],
      },
    },
    {
      userId: "p2",
      displayName: "Store Beta",
      roleLabel: "Магазин",
      initials: "SB",
      status: "general",
      partnershipId: "ps2",
      effective: {
        validityDays: 30,
        purchaseLimit: 1,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        categoryRates: [],
      },
    },
  ],
  incomingProposals: [],
});

describe("certificatePolicyIncomingProposalTitle", () => {
  it("uses counterpart display name when proposer matches", () => {
    const ws = baseWs();
    const title = certificatePolicyIncomingProposalTitle(ws, {
      id: "x",
      version: 1,
      proposerUserId: "p2",
      receiverUserId: "owner",
      createdAt: new Date().toISOString(),
      proposed: ws.general.effective,
      effective: ws.general.effective,
    });
    expect(title).toBe("Store Beta предлагает новые условия");
  });

  it("does not invent a name for unknown proposer", () => {
    const ws = baseWs();
    const title = certificatePolicyIncomingProposalTitle(ws, {
      id: "x",
      version: 1,
      proposerUserId: "unknown-id",
      receiverUserId: "owner",
      createdAt: new Date().toISOString(),
      proposed: ws.general.effective,
      effective: ws.general.effective,
    });
    expect(title).toContain("контрагент не найден");
    expect(title).not.toMatch(/Store Alpha|Store Beta/);
  });
});