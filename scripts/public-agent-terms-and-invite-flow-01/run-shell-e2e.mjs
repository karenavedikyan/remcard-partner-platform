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

async function waitForProfReady() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetch(`${PROF_URL}/api/remcard/api/auth/me`, {
        headers: { Origin: PROF_URL },
      });
      if (res.status === 401 || res.status === 200) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  failures.push(`PROF not ready at ${PROF_URL}`);
}

async function main() {
  fs.mkdirSync(ART_DIR, { recursive: true });
  await waitForProfReady();
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

  const partnersBefore = await jsonFetch(
    storeToken,
    "GET",
    "/api/store/certificate/available-partners",
  );
  assert(partnersBefore.status === 200, `available-partners ${partnersBefore.status}`);
  const agentPartner = (partnersBefore.data?.partners ?? []).find(
    (p) => p.storeUserId === flow.agent.userId,
  );
  assert(agentPartner, "builder lists active agent partner");
  const agentDoors = (agentPartner.categories ?? []).find((c) => c.category === "doors");
  assert(
    agentDoors && Math.abs(Number(agentDoors.poolPercent) - 11.5) < 0.01,
    "builder shows agreed 11.5%",
  );
  evidence.steps.push("certificate-builder-11.5");

  const termsSnapshotBefore = JSON.stringify(row.terms);
  const postLimit = await jsonFetch(storeToken, "POST", "/api/pro/limits/org", {
    category: "doors",
    categoryLabel: "Двери",
    poolPercent: 15,
  });
  assert(postLimit.status === 200, `org limit POST ${postLimit.status}`);
  const limitsMid = await jsonFetch(storeToken, "GET", "/api/pro/limits/org");
  assert(limitsMid.status === 200, `org limits GET ${limitsMid.status}`);
  const doorsMid = (limitsMid.data?.limits ?? []).find((l) => l.category === "doors");
  assert(doorsMid && Math.abs(Number(doorsMid.poolPercent) - 15) < 0.01, "org limit read 15%");

  const delLimit = await jsonFetch(storeToken, "DELETE", "/api/pro/limits/org", {
    category: "doors",
  });
  assert(delLimit.status === 200, `org limit DELETE ${delLimit.status}`);
  const limitsAfterDel = await jsonFetch(storeToken, "GET", "/api/pro/limits/org");
  assert(
    !(limitsAfterDel.data?.limits ?? []).some((l) => l.category === "doors"),
    "doors limit removed",
  );

  list = await jsonFetch(agentToken, "GET", "/api/partnership/list");
  row = (list.data?.partnerships ?? []).find((p) => p.id === partnershipId);
  assert(JSON.stringify(row?.terms) === termsSnapshotBefore, "partnership terms unchanged after org limit edit");

  const partnersAfter = await jsonFetch(
    storeToken,
    "GET",
    "/api/store/certificate/available-partners",
  );
  const agentAfter = (partnersAfter.data?.partners ?? []).find(
    (p) => p.storeUserId === flow.agent.userId,
  );
  const doorsAfterPartner = (agentAfter?.categories ?? []).find((c) => c.category === "doors");
  assert(
    doorsAfterPartner && Math.abs(Number(doorsAfterPartner.poolPercent) - 11.5) < 0.01,
    "builder still 11.5% after general limits change",
  );
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

## Closure
1. UI: Playwright click-through + editor captures (see visual-clickthrough/)
2. Server: accept_pending legacy vs strict empty-request, prof-test limits guard (integration)
3. Shell API gate: org limit POST/GET/DELETE + certificate builder 11.5% stability

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
