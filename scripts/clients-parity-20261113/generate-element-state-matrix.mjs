import { writeFileSync } from "node:fs";
import path from "node:path";

const PAGE_DEFS = [];
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
  const agentReceivingExcluded = p >= 107 && p <= 112;
  const observerList = p === 106 || [86, 95, 104, 113, 122].includes(p);
  const observerDrill = [87, 96, 105, 114, 123].includes(p);
  const receivingIncoming = [79, 80, 88, 89, 97, 98, 115, 116].includes(p) || (role !== "agent" && !observerList);
  PAGE_DEFS.push({ page: p, role, agentReceivingExcluded, observerList, observerDrill, receivingIncoming });
}

const CONTROLS = [
  { req: "C01", sel: "clients-direction-workspace", impl: "ClientsDirectionWorkspace.tsx", proto: "roles.js", pages: () => true },
  { req: "C03", sel: "ca-clients-directions", impl: "ClientsDirectionTabs.tsx", proto: "client-appeals.js", pages: (p) => p.role !== "agent" && !p.agentReceivingExcluded },
  { req: "C07", sel: "ca-receiving-appeals-blocked", impl: "ReceivingAppealsBlocked.tsx", proto: "client-appeals.js", pages: (p) => p.receivingIncoming, blocker: "BLK-RECEIVING-APPEALS" },
  { req: "C26", sel: "ca-observer-partners-list", impl: "ObserverPartnersListView.tsx", proto: "client-appeals.js", pages: (p) => p.observerList || p.page === 106 },
  { req: "C27", sel: "ca-observer-partner-card", impl: "ObserverPartnerCard.tsx", proto: "client-appeals.css", pages: (p) => p.observerList || p.page === 106 },
  { req: "C29", sel: "ca-observer-partner-details", impl: "ObserverPartnerCard.tsx", proto: "client-appeals.css", pages: (p) => p.observerList || p.page === 106, state: "expanded" },
  { req: "C31", sel: "data-observer-group", impl: "ObserverPartnerCard.tsx", proto: "observer-personal-list.js", pages: (p) => p.observerList || p.page === 106 },
  { req: "C33", sel: "ca-observer-filter-chips", impl: "ObserverFilterChips.tsx", proto: "client-appeals.js", pages: (p) => p.observerList || p.page === 106 },
  { req: "C35", sel: "data-observer-personal-edit", impl: "ObserverPersonalEditPanel.tsx", proto: "observer-personal-list.js", pages: (p) => p.observerList || p.page === 106, blocker: "BLK-OBSERVER-PERSONAL-PERSIST", uiOnly: true },
  { req: "C36", sel: "data-observer-personal-edit", impl: "ObserverPersonalEditPanel.tsx", proto: "observer-personal-list.js", pages: (p) => p.observerList || p.page === 106, state: "bulk", blocker: "BLK-OBSERVER-PERSONAL-PERSIST", uiOnly: true },
  { req: "C37", sel: "ca-observer-personal-confirm", impl: "ObserverPersonalConfirmPanel.tsx", proto: "observer-personal-list.js", pages: (p) => p.observerList || p.page === 106, blocker: "BLK-OBSERVER-PERSONAL-PERSIST", uiOnly: true },
  { req: "C39", sel: "ca-observer-partner-page", impl: "ObserverPartnerDetailView.tsx", proto: "client-appeals.js", pages: (p) => p.observerDrill, blocker: "BLK-OBSERVER-REFERRED" },
  { req: "C40", sel: "ca-observer-client-page", impl: "ObserverClientDetailView.tsx", proto: "client-appeals.js", pages: (p) => p.observerDrill, blocker: "BLK-OBSERVER-REFERRED" },
  { req: "C42", sel: "observer.module.css", impl: "observer.module.css", proto: "client-appeals.css", pages: (p) => p.observerList || p.page === 106, status: "NOT_STARTED", note: "numeric token test partial" },
  { req: "C48", sel: "screenshot-overlay", impl: "audit/clients-parity-20261113", proto: "prototype", pages: () => true, status: "NOT_STARTED", note: "QA only" },
];

const STATUSES_UI = new Set(["C26", "C27", "C29", "C31", "C33", "C03", "C39", "C40"]);

const rows = [];
for (const page of PAGE_DEFS) {
  if (page.agentReceivingExcluded) {
    rows.push({
      requirement_id: "C05",
      page: page.page,
      role: page.role,
      state: "EXCLUDED",
      selector: "agent-receiving",
      status: "EXCLUDED",
      blocker: "agent observer-only",
    });
    continue;
  }
  for (const c of CONTROLS) {
    if (!c.pages(page)) continue;
    let status = c.status ?? "NOT_STARTED";
    let blocker = c.blocker ?? "";
    if (!c.status) {
      if (blocker && !c.uiOnly) status = "BLOCKED";
      else if (blocker && c.uiOnly) status = "IN_PROGRESS";
      else if (STATUSES_UI.has(c.req)) status = "IN_PROGRESS";
    }
    rows.push({
      requirement_id: c.req,
      page: page.page,
      role: page.role,
      state: c.state ?? "default",
      selector: c.sel,
      accessible_name: "",
      prototype_source: c.proto,
      implementation_location: c.impl,
      api_contract: blocker || "none",
      expected_transition: c.uiOnly ? "UI-only; persistence blocked" : "",
      status,
      blocker,
      note: c.note ?? (c.uiOnly ? "UI cancel/verify only; no PASS for save" : ""),
    });
  }
}

const csvHeader =
  "requirement_id,page,role,state,selector,implementation_location,status,blocker,note\n";
const csv =
  csvHeader +
  rows
    .map((r) =>
      [r.requirement_id, r.page, r.role, r.state, r.selector, r.implementation_location, r.status, r.blocker, r.note]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

const outJson = path.resolve("src/lib/clients-parity/element-state-matrix.json");
const outCsv = path.resolve("src/lib/clients-parity/element-state-matrix.csv");
writeFileSync(outJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), rowCount: rows.length, rows }, null, 2)}\n`);
writeFileSync(outCsv, csv);
console.log(`Wrote ${rows.length} rows`);
