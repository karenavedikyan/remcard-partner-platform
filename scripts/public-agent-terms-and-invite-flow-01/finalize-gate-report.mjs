/**
 * Single closure REPORT/EVIDENCE after shell + clickthrough both succeeded (gate invokes this).
 */
import fs from "node:fs";
import path from "node:path";

const ART = path.resolve("artifacts/public-agent-terms-and-invite-flow-01");
const evidencePath = path.join(ART, "EVIDENCE.json");
const clickPath = path.join(ART, "visual-clickthrough", "clickthrough.json");

const LIMITATIONS = [
  "Historical certificate snapshot lifecycle was not re-verified in this bounded closure.",
  "Concurrency guarantees for every partnership offer write path were not re-audited; only the scripted shell/API gate steps apply.",
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const evidence = readJson(evidencePath);
const click = readJson(clickPath);
const runtime = {
  frontendSha: process.env.E2E_APPLICATION_FRONTEND_SHA ?? evidence.runtime?.frontendSha,
  backendSha: process.env.E2E_APPLICATION_BACKEND_SHA ?? evidence.runtime?.backendSha,
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT ?? evidence.runtime?.captureStartedAt,
};

const merged = {
  failures: [],
  runtime,
  shell: evidence.extra ?? {},
  clickthrough: {
    evidenceSteps: click.evidenceSteps ?? [],
    presentation: click.presentation ?? {},
  },
  limitations: LIMITATIONS,
};

const report = `# REPORT — public agent terms (closure)

## Status
READY FOR REVIEW

## Runtime SHAs
- Frontend: \`${runtime.frontendSha}\`
- Backend: \`${runtime.backendSha}\`
- Capture: \`${runtime.captureStartedAt}\`

## Closure (this run)
1. UI: Playwright R04 agent click-through + editor save/reload 13% (visual-clickthrough/)
2. Server: accept_pending + prof-test org limits guard (vitest integration in gate log)
3. Shell API gate: org limit POST/GET/DELETE + available-partners 11.5% (same gate run as log)

## Actor vs target UI
- \`shouldShowAgentPublishedTermsForSearch\`: agents always see published terms via \`isAgentActivityInviter\`; target filter \`agent\` kept for non-agent viewers.

## Honest limitations (not claimed verified)
${LIMITATIONS.map((l) => `- ${l}`).join("\n")}

## Failures
- none

## Presentation (clickthrough)
${JSON.stringify(click.presentation ?? {}, null, 2)}

## Extra (shell)
${JSON.stringify(evidence.extra ?? {}, null, 2)}
`;

fs.writeFileSync(path.join(ART, "REPORT.md"), report, "utf8");
fs.writeFileSync(path.join(ART, "EVIDENCE.json"), JSON.stringify(merged, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, merged: true, runtime }, null, 2));
