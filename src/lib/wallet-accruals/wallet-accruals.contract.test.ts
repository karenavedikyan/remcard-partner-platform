import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { SettlementsResponse } from "@/lib/settlements-types";
import {
  buildWalletHistoryRows,
  filterWalletHistoryRows,
  historyTotalLabel,
  sumHistoryRowAmountsKopecks,
  walletCardTotals,
  txnViewFromRow,
} from "@/lib/wallet-accruals/map-history";
import { walletDetailTabCounts } from "@/lib/wallet-accruals/detail-buckets";
import { rubToKopecks } from "@/lib/wallet-accruals/amounts";
import { formatIsoShort } from "@/lib/wallet-accruals/format";
import { resolveWalletPresentationForSession } from "@/lib/wallet-accruals/presentation-session";
import { buildTxnFacts } from "@/lib/wallet-accruals/timeline";
import { walletDetailTabCounts, walletBucketSummary } from "@/lib/wallet-accruals/detail-buckets";

const openRow = {
  id: "b1",
  orderId: "ord-long-id-9001",
  accrualType: "bonus" as const,
  counterpartyId: "store-1",
  counterpartyName: "Магазин",
  amount: 45.5,
  basis: "Отделка",
  status: "CONFIRMED",
  createdAt: "2026-10-01T07:00:00.000Z",
  pendingAmount: 25,
  paidAmount: 10,
  rewardPaidAt: "2026-10-15T21:00:00.000Z",
  confirmationAt: "2026-11-12T21:00:00.000Z",
};

describe("wallet accruals contract", () => {
  it("B1 agent incoming uses settlements shape only (no agent orders API in workspace)", () => {
    const agentView: SettlementsResponse = {
      receivable: [{ ...openRow, payoutActions: undefined }],
      payable: [],
      completed: [],
      coverageNote: "R05",
    };
    const data = {
      receivable: agentView.receivable,
      payable: agentView.payable,
      completed: agentView.completed,
    };
    const rows = buildWalletHistoryRows(data, "in", true);
    assert.ok(rows.some((r) => r.kind === "confirmed"));
    assert.equal(rows.some((r) => r.direction === "out"), false);
  });

  it("B2 completed CANCELLED is return not received; PAID without paidAt stays paid with unknown date", () => {
    const data = {
      receivable: [],
      payable: [],
      completed: [
        {
          ...openRow,
          id: "c-cancel",
          status: "CANCELLED",
          amount: 0,
          paidAt: null,
          rewardPaidAt: null,
          paidAmount: undefined,
          direction: "receivable" as const,
        },
        {
          ...openRow,
          id: "c-paid",
          status: "PAID",
          amount: 100,
          paidAt: null,
          rewardPaidAt: null,
          direction: "receivable" as const,
        },
      ],
    };
    const rows = buildWalletHistoryRows(data, "in", false);
    assert.ok(rows.some((r) => r.kind === "return" && r.lineId === "c-cancel"));
    assert.ok(!rows.some((r) => r.kind === "received" && r.lineId === "c-cancel"));
    const paid = rows.find((r) => r.lineId === "c-paid");
    assert.equal(paid?.kind, "received");
    assert.equal(paid?.sortDate, "");
  });

  it("B3 MSK formatting does not use browser-local slice; missing payout date stays dash in facts", () => {
    const facts = buildTxnFacts(
      { ...openRow, paidAt: null, direction: "receivable", status: "PAID" },
      { lineId: "x", rowKind: "received", amount: 10, sortDate: "" },
      "Мне должны",
    );
    assert.ok(facts.some(([, v]) => v === "—"));
    assert.equal(formatIsoShort("2026-10-01T07:00:00.000Z"), "01.10.2026");
  });

  it("B4 partial paidAmount on open row surfaces without duplicating completed PAID", () => {
    const data = {
      receivable: [openRow],
      payable: [],
      completed: [],
    };
    const rows = buildWalletHistoryRows(data, "in", false);
    assert.ok(rows.some((r) => r.kind === "received" && r.amount === 10));
    assert.ok(rows.some((r) => r.kind === "confirmed" && r.amount === 45.5));
    const totals = walletCardTotals(data, "in");
    assert.equal(totals.confirmedUnpaid, 45.5);
    assert.equal(historyTotalLabel("all"), "Сумма операций");
    const allRows = filterWalletHistoryRows(rows, "all", "in");
    assert.equal(sumHistoryRowAmountsKopecks(allRows), rubToKopecks(45.5 + 25 + 10));
  });

  it("N3 wallet entry points use one accruals surface (no stacked legacy dashboard)", () => {
    const root = path.join(process.cwd(), "src/components");
    const business = fs.readFileSync(path.join(root, "business-wallet/BusinessOwnerWallet.tsx"), "utf8");
    const specialist = fs.readFileSync(path.join(root, "specialist-wallet/SpecialistMasterWallet.tsx"), "utf8");
    const agent = fs.readFileSync(path.join(root, "agent-r05/AgentReceivablesWallet.tsx"), "utf8");
    assert.ok(!business.includes("SpecialistSettlementsWorkspace"));
    assert.ok(!specialist.includes("SpecialistSettlementsWorkspace"));
    assert.ok(!agent.includes("AgentReceivablesHub"));
    assert.ok(business.includes("masterLedger"));
    assert.ok(agent.includes("agentRegistry"));
  });

  it("N4 detail tab counts align with bucket summary for review lifecycle", () => {
    const reviewRow = {
      ...openRow,
      id: "review-2",
      amount: 0,
      pendingAmount: 100,
      suspendedAmount: 50,
      confirmationLabel: "Требует сверки",
      status: "CALCULATED",
    };
    const data = { receivable: [reviewRow], payable: [], completed: [] };
    const buckets = walletBucketSummary(data, "in");
    const counts = walletDetailTabCounts(data, "in", false);
    assert.equal(buckets.waiting, 100);
    assert.equal(buckets.suspended, 50);
    assert.equal(counts.waiting, 1);
    assert.equal(counts.suspended, 1);
    assert.equal(counts.confirmed, 0);
  });

  it("N4 review lifecycle emits disjoint pending waiting and suspended+review rows", () => {
    const reviewRow = {
      ...openRow,
      id: "review-1",
      amount: 0,
      pendingAmount: 100,
      suspendedAmount: 50,
      confirmationLabel: "Требует сверки",
      status: "CALCULATED",
    };
    const data = { receivable: [reviewRow], payable: [], completed: [] };
    const rows = buildWalletHistoryRows(data, "in", false);
    const waiting = rows.filter((r) => r.lineId === "review-1" && r.kind === "waiting");
    const suspended = rows.filter((r) => r.lineId === "review-1" && r.kind === "suspended");
    assert.equal(waiting.length, 1);
    assert.equal(waiting[0]?.amount, 100);
    assert.equal(suspended.length, 1);
    assert.equal(suspended[0]?.amount, 50);
    assert.equal(rows.some((r) => r.kind === "confirmed"), false);
  });

  it("N5 return rows have no amount and no sort date", () => {
    const data = {
      receivable: [],
      payable: [],
      completed: [
        {
          ...openRow,
          id: "c-cancel",
          status: "CANCELLED",
          amount: 0,
          paidAt: null,
          direction: "receivable" as const,
        },
      ],
    };
    const row = buildWalletHistoryRows(data, "in", false).find((r) => r.kind === "return");
    assert.equal(row?.amount, 0);
    assert.equal(row?.sortDate, "");
  });

  it("N2 session resolver never exposes actor PAN without provableWalletOwnership", () => {
    const pres = resolveWalletPresentationForSession(
      {
        user: { id: "u1", displayName: "Иван", publicId: "RC-1234" },
      } as never,
      { fallbackRibbon: "Магазин" },
    );
    assert.equal(pres.cardIdentifier, null);
    assert.equal(pres.ribbonLabel, "Магазин");
  });

  it("review with paidAmount duplicating overpayment does not double-count in history sum", () => {
    const reviewRow = {
      ...openRow,
      id: "rev-paid",
      amount: 0,
      pendingAmount: 50,
      suspendedAmount: 30,
      paidAmount: 30,
      confirmationLabel: "Требует сверки",
      status: "CALCULATED",
    };
    const data = { receivable: [reviewRow], payable: [], completed: [] };
    const rows = buildWalletHistoryRows(data, "in", false);
    assert.equal(rows.some((r) => r.kind === "received"), false);
    assert.equal(
      sumHistoryRowAmountsKopecks(rows),
      rubToKopecks(50 + 30),
    );
    const totals = walletCardTotals(data, "in");
    assert.equal(totals.confirmedUnpaid, 0);
    assert.equal(totals.waiting, 50);
  });

  it("ordinary suspended row is separate from review and includes open paid history", () => {
    const suspendedRow = {
      ...openRow,
      id: "susp-1",
      amount: 100,
      pendingAmount: 0,
      suspendedAmount: 40,
      paidAmount: 15,
      confirmationLabel: "Спор",
      status: "CONFIRMED",
    };
    const data = { receivable: [suspendedRow], payable: [], completed: [] };
    const rows = buildWalletHistoryRows(data, "in", false);
    assert.ok(rows.some((r) => r.kind === "suspended" && r.amount === 40));
    assert.ok(rows.some((r) => r.kind === "received" && r.amount === 15));
    assert.ok(rows.some((r) => r.kind === "confirmed" && r.amount === 100));
  });

  it("detail tab counts match classifier history rows", () => {
    const data = {
      receivable: [
        {
          ...openRow,
          id: "mix",
          amount: 0,
          pendingAmount: 10,
          suspendedAmount: 20,
          confirmationLabel: "Требует сверки",
          status: "CALCULATED",
        },
      ],
      payable: [],
      completed: [],
    };
    const counts = walletDetailTabCounts(data, "in", false);
    const rows = buildWalletHistoryRows(data, "in", false);
    assert.equal(counts.waiting, rows.filter((r) => r.kind === "waiting" || r.kind === "return").length);
    assert.equal(counts.suspended, rows.filter((r) => r.kind === "suspended").length);
    assert.equal(counts.confirmed, rows.filter((r) => r.kind === "confirmed").length);
  });

  it("waiting fact labels confirmationAt as deadline", () => {
    const facts = buildTxnFacts(
      { ...openRow, confirmationAt: "2026-11-12T21:00:00.000Z" },
      { lineId: "x", rowKind: "waiting", amount: 25, sortDate: "2026-11-12T21:00:00.000Z" },
      "Мне должны",
    );
    assert.ok(facts.some(([l, v]) => l === "Подтверждение" && v.startsWith("до ")));
  });

  it("integer kopecks prevent float drift on card totals", () => {
    const row = { ...openRow, amount: 0.1 + 0.2 };
    const totals = walletCardTotals({ receivable: [row], payable: [], completed: [] }, "in");
    assert.equal(totals.confirmedUnpaid, 0.3);
  });

  it("txn facts use operation amount label not misleading order total", () => {
    const facts = buildTxnFacts(
      openRow,
      txnViewFromRow({
        rowKey: "k",
        lineId: openRow.id,
        direction: "in",
        kind: "confirmed",
        amount: 45.5,
        sortDate: openRow.createdAt,
        category: "x",
        partner: "y",
        purchaseId: "9001",
        source: openRow,
      }),
      "Мне должны",
    );
    assert.ok(facts.some(([l]) => l === "Подтверждено к выплате"));
    assert.ok(!facts.some(([l]) => l === "Сумма по заказу"));
  });
});
