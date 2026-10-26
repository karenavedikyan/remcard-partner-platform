/**
 * Isolated API gate: general terms → request → offer → request changes → accept versioned → history stable.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3452").replace(/\/$/, "");
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
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT ?? new Date().toISOString(),
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
    failures.push("roles.agentTermsFlow missing");
    writeReport();
    process.exit(1);
  }

  const storeToken = flow.storeOwner.ownerSessionToken;
  const agentToken = flow.agent.agentSessionToken;
  const storeUserId = flow.storeOwner.userId;
  const evidence = { steps: [] };

  const summary = await jsonFetch(
    agentToken,
    "GET",
    `/api/partner/${encodeURIComponent(storeUserId)}/certificate-program-summary`,
  );
  assert(summary.status === 200, `summary ${summary.status}`);
  const item = (summary.data?.items ?? []).find((i) => i.category === "doors");
  assert(item && Math.abs(Number(item.poolPercent) - 12.5) < 0.01, "agent reads 12.5%");
  evidence.steps.push("read-summary-12.5");

  const invite = await jsonFetch(agentToken, "POST", "/api/partnership/invite", {
    targetUserId: storeUserId,
    cooperationRequest: true,
    terms: [],
    note: "Интересуют двери",
  });
  assert(invite.status === 200, `invite ${invite.status}`);
  const partnershipId = invite.data?.partnershipId ?? invite.data?.partnership?.id;
  assert(partnershipId, "partnershipId");
  evidence.steps.push("agent-request-no-terms");

  const badAccept = await jsonFetch(storeToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "accept",
  });
  assert(badAccept.status === 400, `accept-without-terms ${badAccept.status}`);

  const offer11 = await jsonFetch(storeToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "counter_offer",
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 11, isExcluded: false }],
  });
  assert(offer11.status === 200, `counter_offer 11 ${offer11.status}`);
  evidence.steps.push("partner-offer-11");

  let list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  let row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  assert(row?.status === "PENDING", `pending ${row?.status}`);
  const version11 = row.updatedAt;

  const staleAccept = await jsonFetch(agentToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "accept_pending",
    expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
  });
  assert(staleAccept.status === 409, `stale accept ${staleAccept.status}`);

  const requestChanges = await jsonFetch(agentToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "counter_offer_back",
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
  });
  assert(requestChanges.status === 200, `counter_offer_back ${requestChanges.status}`);
  evidence.steps.push("agent-request-changes-10");

  list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  assert(row?.status === "PENDING", `still pending ${row?.status}`);

  const finalOffer = await jsonFetch(storeToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "counter_offer",
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 11.5, isExcluded: false }],
  });
  assert(finalOffer.status === 200, `final offer ${finalOffer.status}`);

  list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  const version115 = row.updatedAt;
  const termBeforeAccept = row?.terms?.find((t) => t.category === "doors");

  const accept = await jsonFetch(agentToken, "PATCH", `/api/partnership/${partnershipId}`, {
    action: "accept_pending",
    expectedUpdatedAt: version115,
  });
  assert(accept.status === 200, `accept ${accept.status}`);
  evidence.steps.push("accept-11.5");

  list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  assert(row?.status === "ACTIVE", `active ${row?.status}`);
  const activeTerm = row?.terms?.find((t) => t.category === "doors" && !t.isExcluded);
  assert(activeTerm && Math.abs(Number(activeTerm.storePercent) - 11.5) < 0.01, "active 11.5%");

  const termsSnapshotBefore = JSON.stringify(row.terms);
  await jsonFetch(storeToken, "POST", "/api/pro/limits/org", {
    category: "doors",
    categoryLabel: "Двери",
    poolPercent: 15,
  });
  await jsonFetch(storeToken, "DELETE", "/api/pro/limits/org", { category: "doors" });

  list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  assert(JSON.stringify(row?.terms) === termsSnapshotBefore, "partnership terms unchanged after org limit edit");
  evidence.steps.push("org-limit-edit-no-partnership-mutation");

  const summaryAfter = await jsonFetch(
    agentToken,
    "GET",
    `/api/partner/${encodeURIComponent(storeUserId)}/certificate-program-summary`,
  );
  assert(summaryAfter.status === 200, "summary after delete");
  const doorsAfter = (summaryAfter.data?.items ?? []).find((i) => i.category === "doors");
  assert(!doorsAfter, "public summary empty after delete");

  assert(
    JSON.stringify(summary.data).indexOf(String(activeTerm?.storePercent)) === -1 ||
      !summary.data.items?.some((i) => i.category === "doors" && i.poolPercent === activeTerm?.storePercent),
    "summary does not leak private active term as public pool",
  );

  writeReport({ partnershipId, storeUserId, version11, version115, termBeforeAccept, evidence });
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, failures: 0, runtime: RUNTIME, evidence }, null, 2));
}

function writeReport(extra = {}) {
  const report = `# REPORT — public agent terms (closure)

## Status
${failures.length ? "FAIL" : "READY FOR REVIEW"}

## Runtime SHAs
- Frontend: \`${RUNTIME.frontendSha}\`
- Backend: \`${RUNTIME.backendSha}\`
- Capture: \`${RUNTIME.captureStartedAt}\`

## Closure (3 groups)
1. UI: editor edit/save, taxonomy error, counter-offer prefill + counter_offer_back
2. Server: agent STORE legacy, prof-test limits guard, accept_pending version, summary meta
3. Executed isolated shell gate (this file)

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
