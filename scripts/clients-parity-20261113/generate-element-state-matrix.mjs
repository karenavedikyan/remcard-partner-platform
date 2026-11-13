import { writeFileSync } from "node:fs";
import path from "node:path";

const pages = [];
for (let p = 79; p <= 123; p++) {
  const role =
    p <= 85
      ? "specialist"
      : p <= 94
        ? "store"
        : p <= 103
          ? "company"
          : p <= 112
            ? "agent"
            : "employee";
  const blocked = p >= 107 && p <= 112;
  const observerOnly = p === 106 || (p >= 113 && p <= 114);
  const receiving = !blocked && !observerOnly;
  pages.push({ page: p, role, receiving, observerOnly, agentReceivingExcluded: blocked });
}

const controls = [
  {
    id: "ca-observer-partners-list",
    req: "C26",
    impl: "ObserverPartnersListView.tsx",
    proto: "client-appeals.js",
  },
  {
    id: "ca-observer-partner-card",
    req: "C27",
    impl: "ObserverPartnerCard.tsx",
    proto: "client-appeals.css",
  },
  {
    id: "ca-clients-directions",
    req: "C03",
    impl: "ClientsDirectionTabs.tsx",
    proto: "client-appeals.js",
  },
  {
    id: "ca-receiving-appeals-blocked",
    req: "C07",
    impl: "ReceivingAppealsBlocked.tsx",
    proto: "client-appeals.js",
    blocker: "BLK-RECEIVING-APPEALS",
  },
  {
    id: "data-observer-personal-edit",
    req: "C35",
    impl: "ObserverPersonalEditPanel.tsx",
    proto: "observer-personal-list.js",
    blocker: "BLK-OBSERVER-PERSONAL-PERSIST",
  },
  {
    id: "ca-observer-personal-confirm",
    req: "C37",
    impl: "ObserverPersonalConfirmPanel.tsx",
    proto: "observer-personal-list.js",
    blocker: "BLK-OBSERVER-PERSONAL-PERSIST",
  },
  {
    id: "ca-observer-partner-page",
    req: "C39",
    impl: "ObserverPartnerDetailView.tsx",
    proto: "client-appeals.js",
    blocker: "BLK-OBSERVER-REFERRED",
  },
  {
    id: "ca-observer-client-page",
    req: "C40",
    impl: "ObserverClientDetailView.tsx",
    proto: "client-appeals.js",
    blocker: "BLK-OBSERVER-REFERRED",
  },
];

const rows = [];
for (const page of pages) {
  for (const c of controls) {
    if (page.agentReceivingExcluded && c.req.startsWith("C0") && c.id.includes("receiving")) {
      continue;
    }
    const applies =
      (c.id.includes("observer") && (page.observerOnly || page.receiving === false)) ||
      (c.id.includes("direction") && page.role !== "agent") ||
      (c.id.includes("receiving") && page.receiving);
    if (!applies && !c.id.includes("observer-partners-list")) continue;
    let status = "NOT_STARTED";
    let blocker = "";
    if (c.blocker) {
      status = page.observerOnly || c.blocker.startsWith("BLK-OBSERVER") ? "BLOCKED" : "BLOCKED";
      blocker = c.blocker;
    } else if (["C26", "C27", "C29", "C31", "C33", "C03", "C39", "C40"].includes(c.req)) {
      status = "IN_PROGRESS";
    }
    rows.push({
      requirement_id: c.req,
      page: page.page,
      role: page.role,
      selector: c.id,
      implementation: c.impl,
      prototype_source: c.proto,
      status,
      blocker,
    });
  }
}

const out = path.resolve("src/lib/clients-parity/element-state-matrix.json");
writeFileSync(out, `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`);
console.log(`Wrote ${rows.length} rows to ${out}`);
