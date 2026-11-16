import { describe, expect, it } from "vitest";
import { certificateTermRows } from "./receiving-certificate-term";

const now = new Date("2026-11-16T10:00:00.000Z");

describe("certificateTermRows", () => {
  it("shows the frozen term and this partner's purchase count", () => {
    const rows = certificateTermRows({
      term: { validUntil: "2027-03-01T20:59:59.000Z", purchaseLimit: 3, consumedUses: 1, remainingPurchases: 2 },
      now,
    });
    expect(rows).toEqual([
      { label: "Действует до", value: expect.stringContaining("2027") },
      { label: "Покупки", value: "3 покупки · осталось 2" },
    ]);
  });

  it("does not repeat a purchase count that nobody used yet", () => {
    const rows = certificateTermRows({
      term: { validUntil: "2027-03-01T20:59:59.000Z", purchaseLimit: 1, consumedUses: 0, remainingPurchases: 1 },
      now,
    });
    expect(rows[1]).toEqual({ label: "Покупки", value: "1 покупка" });
  });

  it("marks an expired term and a used-up certificate", () => {
    const rows = certificateTermRows({
      term: { validUntil: "2026-10-01T20:59:59.000Z", purchaseLimit: 2, consumedUses: 2, remainingPurchases: 0 },
      now,
    });
    expect(rows[0].label).toBe("Срок истёк");
    expect(rows[1].value).toBe("2 покупки · все использованы");
  });

  it("falls back to the certificate-level date and shows a dash only without any term", () => {
    expect(certificateTermRows({ legacyValidUntil: "2027-01-31T20:59:59.000Z", now })[0].value).toContain("2027");
    expect(certificateTermRows({ legacyValidUntil: null, now })).toEqual([{ label: "Действует до", value: "—" }]);
  });
});
