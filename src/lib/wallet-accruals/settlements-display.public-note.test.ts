import { describe, expect, it } from "vitest";
import { publicSettlementsCoverageNote } from "./settlements-display";
import type { SettlementCompleted } from "@/lib/settlements-types";
import { reconciliationSummary } from "@/lib/specialist-settlements/ledger";

const FORBIDDEN = /order-linked|legacy|certificatePartner|R0\d|principal agent/i;

const UPSTREAM =
  "Показаны взаиморасчёты по подтверждённым покупкам (order-linked). Начисления без связи с покупкой и legacy-заказы без certificatePartner не включены.";
const UPSTREAM_AGENT = `${UPSTREAM} R05: для principal agent скрыты исходящие обязательства и действия выплаты.`;

describe("publicSettlementsCoverageNote (v9.2 F3)", () => {
  it("rewrites the server note into plain Russian", () => {
    const text = publicSettlementsCoverageNote(UPSTREAM);
    expect(text).toBe(
      "Показаны расчёты по подтверждённым покупкам. Начисления без связи с покупкой не включены.",
    );
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("drops the R05 / principal agent sentence from the agent note", () => {
    const text = publicSettlementsCoverageNote(UPSTREAM_AGENT);
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).toContain("Показаны расчёты по подтверждённым покупкам.");
  });

  it("works on the note merged from several branch responses", () => {
    const merged = `Показаны расчёты по филиалам с правом просмотра (2). ${UPSTREAM_AGENT} · ${UPSTREAM}`;
    expect(publicSettlementsCoverageNote(merged)).not.toMatch(FORBIDDEN);
  });

  it("returns null when nothing user-facing is left", () => {
    expect(publicSettlementsCoverageNote("R05: incoming-only view")).toBeNull();
    expect(publicSettlementsCoverageNote("  ")).toBeNull();
    expect(publicSettlementsCoverageNote(null)).toBeNull();
  });

  it("keeps an ordinary plain note untouched", () => {
    expect(publicSettlementsCoverageNote("Показаны подтверждённые покупки.")).toBe(
      "Показаны подтверждённые покупки.",
    );
  });

  it("the reconciliation hints of the specialist wallet are free of technical terms", () => {
    const withUnknownPaidAt: SettlementCompleted[] = [
      {
        id: "legacy-row",
        orderId: "o1",
        accrualType: "bonus",
        counterpartyId: "p1",
        counterpartyName: "Alpha",
        amount: 30,
        basis: "Сертификат RC-1",
        status: "PAID",
        createdAt: "2026-10-02T10:00:00.000Z",
        paidAt: null,
        direction: "payable",
      },
    ];
    const recon = reconciliationSummary(withUnknownPaidAt, {
      q: "",
      from: "2026-10-01",
      to: "2026-10-31",
      sort: "date-desc",
    });
    expect(recon.gaps.length).toBeGreaterThanOrEqual(3);
    for (const gap of recon.gaps) {
      expect(gap).not.toMatch(FORBIDDEN);
    }
  });
});
