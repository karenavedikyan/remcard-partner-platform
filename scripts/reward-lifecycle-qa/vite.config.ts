import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { applyRewardAction, createRewardLifecycle, lineAmounts, matureRewards, rewardSummary } from "../../../backend/src/lib/orderRewards/lifecycle";
const orderId = "caaaaaaaaaaaaaaaaaaaaaaaa";
let now = new Date("2026-11-02T13:51:00.000Z");
let state = createRewardLifecycle([
  { category: "doors", categoryLabel: "Двери", amount: 120000, issuerAmount: 6000 },
  { category: "flooring", categoryLabel: "Напольные покрытия", amount: 57000, issuerAmount: 5700 },
], now);
const receipts: unknown[] = [];
function dto(recipient: boolean) {
  return { actorId: recipient ? "qa-recipient" : "qa-payer", permissions: {
    recipient, payerOwner: !recipient, sellerAllowed: !recipient, canSuspend: true, cash: !recipient, transfer: !recipient,
  }, reward: { version: 1, summary: rewardSummary(state), nextConfirmationAt: state.nextConfirmationAt,
    lines: state.lines.map(l => ({ ...l, ...lineAmounts(state, l), canResume: l.suspendedBy === (recipient ? "qa-recipient" : "qa-payer") })),
    payments: state.payments, history: state.events.map(e => ({ at: e.at, action: e.action, lineId: e.lineId ?? null,
      kopecks: e.kopecks ?? null, actor: e.actorId === "system" ? "Система" : "Участник" })),
  } };
}
export default defineConfig({
  root: __dirname,
  plugins: [react(), { name: "owned-financial-fixture", configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url!, "http://127.0.0.1:5198");
      url.pathname = url.pathname.replace(/^\/api\/remcard(?=\/)/, "");
      if (!url.pathname.startsWith("/api/")) return next();
      const send = (data: unknown, status = 200) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
      const recipient = req.headers.cookie?.includes("qa-recipient=1") ?? false;
      try {
        let body: any = null;
        if (req.method === "POST") { let raw = ""; for await (const chunk of req) raw += chunk; body = raw ? JSON.parse(raw) : null; }
        if (url.pathname === "/api/csrf") { res.setHeader("Set-Cookie", "remcard-csrf=qa-token; Path=/; SameSite=Lax"); return send({ ok: true }); }
        if (url.pathname === "/api/qa/receipts") return send(receipts);
        if (url.pathname === "/api/qa/advance") { now = new Date("2026-12-20T00:00:00.000Z"); state = matureRewards(state, now); return send({ ok: true }); }
        if (url.pathname.includes("/order-rewards/")) {
          if (req.method === "POST") {
            if (!req.headers["idempotency-key"] || !req.headers["x-csrf-token"]) return send({ error: "Missing financial headers" }, 400);
            receipts.push({ path: url.pathname, body, key: req.headers["idempotency-key"] });
            state = applyRewardAction(state, body, { actorId: recipient ? "qa-recipient" : "qa-payer",
              side: recipient ? "recipient" : "payer", now, key: String(req.headers["idempotency-key"]), fingerprint: JSON.stringify(body) });
          }
          return send(dto(recipient));
        }
        if (url.pathname === "/api/store/order/preview") return send({ allowed: true,
          certificate: { id: "qa-cert", promoCode: "RC-QA-ONLY", status: "ACTIVE", validUntil: null, usageCount: 0,
            maxUsages: 0, userAlias: "Синтетический клиент", issuer: { label: "Агент", name: "Тестовый агент" }, partnerCards: [] },
          partner: { id: "qa-partner", storeName: "Тестовый продавец", isSelfScan: false },
          availableCategories: [
            { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 },
            { category: "flooring", categoryLabel: "Напольные покрытия", discountPercent: 5, issuerPercent: 10 },
            { category: "handles", categoryLabel: "Фурнитура", discountPercent: 15, issuerPercent: 0 },
          ] });
        if (url.pathname === "/api/store/order" && req.method === "POST") {
          receipts.push({ path: url.pathname, body, key: req.headers["idempotency-key"] });
          state = createRewardLifecycle(body.items.map((i: any) => ({ ...i, categoryLabel: i.category === "doors" ? "Двери" : i.category === "flooring" ? "Напольные покрытия" : "Фурнитура",
            issuerAmount: i.amount * (i.category === "doors" ? 0.05 : i.category === "flooring" ? 0.1 : 0) })), now);
          return send({ order: { id: orderId }, summary: { totalAmount: body.items.reduce((s: number, i: any) => s + i.amount, 0),
            discountAmount: 18870, issuerBonusAmount: rewardSummary(state).original / 100, isSelfScan: false } }, 201);
        }
        const s = rewardSummary(state);
        if (url.pathname.endsWith("/settlements")) return send({ receivable: [], payable: [{
          id: "qa-bonus", source: "BONUS", orderId, amount: s.confirmed / 100, pendingAmount: s.pending / 100,
          suspendedAmount: s.suspended / 100, hasIndividualTerms: true, status: "CALCULATED",
          createdAt: "2026-11-02T13:51:00Z", counterparty: { id: "qa-recipient", name: "Тестовый агент", role: "PRO" },
          accrualType: "agentBonus", counterpartyId: "qa-recipient", counterpartyName: "Тестовый агент",
          basis: "Сертификат RC-QA-ONLY", confirmationLabel: s.pending && s.confirmed ? "Частично подтверждено" : s.pending ? "Ожидает подтверждения" : "Подтверждено",
          storeName: "Тестовый продавец", clientLabel: "Синтетический клиент",
        }], completed: [] });
        if (url.pathname.endsWith("/agent-receivables/overview")) return send({
          contractVersion: "qa", confirmedTotalKopecks: s.confirmed, pendingTotalKopecks: s.pending,
          suspendedTotalKopecks: s.suspended, openCount: s.confirmed ? 1 : 0, pendingCount: s.pending ? 1 : 0,
          coverage: { note: "Только синтетическая покупка", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
        });
        return send({ error: `Unimplemented owned QA endpoint: ${url.pathname}` }, 404);
      } catch (e) { return send({ error: e instanceof Error ? e.message : "QA error" }, 409); }
    });
  } }],
  resolve: { alias: [
    { find: "next/link", replacement: path.resolve(__dirname, "../admin-mobile-visual-harness/stubs/next-link.tsx") },
    { find: "next/navigation", replacement: path.resolve(__dirname, "../admin-mobile-visual-harness/stubs/next-navigation.tsx") },
    { find: "@", replacement: path.resolve(__dirname, "../../src") },
  ] },
  server: { host: "127.0.0.1", port: 5198, strictPort: true, fs: { allow: [path.resolve(__dirname, "../../..")] } },
});
