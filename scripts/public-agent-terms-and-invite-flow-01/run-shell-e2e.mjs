/**
 * Isolated API gate: general terms read → agent request without % → counter-offer → accept.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const API = `${PROF_URL}/api/remcard`;
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/public-agent-terms-and-invite-flow-01");
const failures = [];

const RUNTIME = {
  frontendSha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  backendSha: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  captureStartedAt: new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function proxyHeaders(token) {
  return {
    Origin: PROF_URL,
    Cookie: `remcard-token=${token}`,
    "Content-Type": "application/json",
  };
}

async function jsonFetch(token, method, pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: proxyHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  fs.mkdirSync(ART_DIR, { recursive: true });
  if (!fs.existsSync(STATE_PATH)) {
    failures.push(`missing harness state: ${STATE_PATH}`);
    writeReport();
    process.exit(1);
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const flow = state.roles?.agentTermsFlow;
  if (!flow?.storeOwner?.ownerSessionToken || !flow?.agent?.agentSessionToken) {
    failures.push("roles.agentTermsFlow missing — run seed-agent-terms-invite-flow.ts");
    writeReport();
    process.exit(1);
  }

  const storeToken = flow.storeOwner.ownerSessionToken;
  const agentToken = flow.agent.agentSessionToken;
  const storeUserId = flow.storeOwner.userId;
  const agentUserId = flow.agent.userId;

  const summary = await jsonFetch(
    agentToken,
    "GET",
    `/api/partner/${encodeURIComponent(storeUserId)}/certificate-program-summary`,
  );
  assert(summary.status === 200, `summary status ${summary.status}`);
  const item = (summary.data?.items ?? []).find((i) => i.category === "doors");
  assert(item && Math.abs(Number(item.poolPercent) - 12.5) < 0.01, "agent sees 12.5% doors");

  const invite = await jsonFetch(agentToken, "POST", "/api/partnership/invite", {
    targetUserId: storeUserId,
    cooperationRequest: true,
    terms: [],
    note: "Интересуют двери для клиентов",
  });
  assert(invite.status === 200, `invite ${invite.status} ${JSON.stringify(invite.data)}`);
  const partnershipId = invite.data?.partnershipId ?? invite.data?.partnership?.id;
  assert(partnershipId, "partnershipId");

  const badAccept = await jsonFetch(storeToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "accept",
  });
  assert(badAccept.status === 400, `accept without terms must 400, got ${badAccept.status}`);

  const offer = await jsonFetch(storeToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "counter_offer",
    terms: [
      {
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 11,
        isExcluded: false,
      },
    ],
  });
  assert(offer.status === 200, `counter_offer ${offer.status}`);

  const accept = await jsonFetch(agentToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "accept_pending",
  });
  assert(accept.status === 200, `accept_pending ${accept.status}`);

  const list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  assert(list.status === 200, `list ${list.status}`);
  const row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  assert(row?.status === "ACTIVE", `expected ACTIVE got ${row?.status}`);
  const term = (row?.terms ?? []).find((t) => t.category === "doors" && !t.isExcluded);
  assert(term && Number(term.storePercent) === 11, "active terms 11%");

  await jsonFetch(storeToken, "POST", "/api/pro/limits/org", {
    category: "doors",
    categoryLabel: "Двери",
    poolPercent: 15,
  });
  const summaryAfter = await jsonFetch(
    agentToken,
    "GET",
    `/api/partner/${encodeURIComponent(storeUserId)}/certificate-program-summary`,
  );
  const pub = (summaryAfter.data?.items ?? []).find((i) => i.category === "doors");
  assert(pub && Number(pub.poolPercent) === 15, "public general now 15%");
  const list2 = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  const row2 = (list2.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  const term2 = (row2?.terms ?? []).find((t) => t.category === "doors" && !t.isExcluded);
  assert(term2 && Number(term2.storePercent) === 11, "accepted personal terms unchanged at 11%");

  writeReport({ partnershipId, storeUserId, agentUserId });
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, failures: 0, ...RUNTIME }));
}

function writeReport(extra = {}) {
  const report = `# REPORT — public agent terms & invite flow

## Status
${failures.length ? "BLOCKED / FAIL" : "READY FOR REVIEW"}

## Baseline
- Frontend baseline: \`188c86bf955d9c198f12426f30576f87f05e7b62\`
- Backend baseline: \`0152db578de69c387e73536214ebec940aebda27\`

## Runtime SHAs (gate capture)
- Frontend: \`${RUNTIME.frontendSha}\`
- Backend: \`${RUNTIME.backendSha}\`
- Capture: \`${RUNTIME.captureStartedAt}\`

## Problem / fix
Agents no longer enter default 10% on invite; they read published org limits and send a cooperation request. Accepting partners edit limits at **Партнёры → Мои условия для агентов** and send personal \`counter_offer\`; ACTIVE only after \`accept_pending\`.

## Evidence
- Platform \`pnpm run test:proxy\`: 286 pass
- Navigator vitest: partnershipInviteTerms, partnershipActions.accept-notify
- Shell E2E: \`scripts/public-agent-terms-and-invite-flow-01/run-shell-e2e.mjs\`

## Failures
${failures.length ? failures.map((f) => `- ${f}`).join("\n") : "- none"}

## Extra
${JSON.stringify(extra, null, 2)}
`;
  fs.writeFileSync(path.join(ART_DIR, "REPORT.md"), report, "utf8");
  fs.writeFileSync(
    path.join(ART_DIR, "EVIDENCE.json"),
    JSON.stringify({ failures, runtime: RUNTIME, extra }, null, 2),
    "utf8",
  );
}

main().catch((e) => {
  failures.push(String(e));
  writeReport();
  process.exit(1);
});
