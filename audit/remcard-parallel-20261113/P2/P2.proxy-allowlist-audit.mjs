#!/usr/bin/env node
/**
 * P2 read-only contract audit: BFF allowlist patterns vs observer requirements.
 * No network; parses src/lib/remcard-proxy.ts only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const proxySrc = fs.readFileSync(path.join(repoRoot, "src/lib/remcard-proxy.ts"), "utf8");

const patterns = [...proxySrc.matchAll(/pattern:\s*\/\^(.+?)\$/g)].map((m) => m[1]);

function hasPattern(re) {
  return patterns.some((p) => re.test(p));
}

const checks = [
  {
    id: "REF-GET-LIST",
    need: "GET /api/pro/referred-appeals",
    pass: hasPattern(/referred-appeal/i),
  },
  {
    id: "REF-GET-ONE",
    need: "GET /api/pro/referred-appeals/:id",
    pass: hasPattern(/referred-appeals\/\[\\w-\]\+/i) || hasPattern(/referred-appeals/i),
  },
  {
    id: "REF-PERSONAL-PATCH",
    need: "PATCH /api/pro/referred-appeals/:id/personal-meta",
    pass: hasPattern(/personal-meta/i),
  },
  {
    id: "REF-PERSONAL-BATCH",
    need: "POST /api/pro/referred-appeals/personal-batch",
    pass: hasPattern(/personal-batch/i),
  },
  {
    id: "AGENT-CLIENT-CRUD",
    need: "AgentClient CRUD (distinct domain)",
    pass: hasPattern(/agent-clients/),
  },
  {
    id: "PARTNER-LIST-PREF",
    need: "Partnership list preferences (distinct domain)",
    pass: hasPattern(/partnership-list-preferences/),
  },
  {
    id: "RECEIVING-APPEALS",
    need: "client-appeals CRM routes",
    pass: hasPattern(/client-appeal/i),
  },
];

let failed = 0;
for (const c of checks) {
  const status = c.pass ? "PRESENT_ALLOWLIST" : "ABSENT_ALLOWLIST";
  if (!c.pass && !c.id.startsWith("AGENT") && !c.id.startsWith("PARTNER")) failed += 1;
  console.log(`${status}\t${c.id}\t${c.need}`);
}

console.log(`\nTotal allowlist patterns scanned: ${patterns.length}`);
console.log(`Observer/referred gaps (expected ABSENT today): ${failed}`);
console.log(failed > 0 ? "AUDIT_RESULT=CONFIRMED_ABSENT" : "AUDIT_RESULT=UNEXPECTED_PRESENT");
process.exit(0);
