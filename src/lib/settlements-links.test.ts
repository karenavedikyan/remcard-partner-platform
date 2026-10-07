import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { settlementAccrualHref } from "./settlements-links";

describe("settlementAccrualHref", () => {
  it("includes accrualType in detail URL", () => {
    assert.equal(
      settlementAccrualHref({
        id: "acc-1",
        orderId: "ord-1",
        accrualType: "agentBonus",
        counterpartyId: "p1",
        counterpartyName: "Shop",
        amount: 50,
        basis: "Сертификат RC-1",
        status: "CONFIRMED",
        createdAt: "2026-10-01T10:00:00.000Z",
      }),
      "/history/accruals/acc-1?type=agentBonus",
    );
  });
});
