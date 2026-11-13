/**
 * Standalone audit assertions (vitest.config include is read-only; audit paths excluded).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const proxy = readFileSync(path.join(root, "src/lib/remcard-proxy.ts"), "utf8");

const checks = [
  {
    name: "no referred-appeals in proxy",
    ok: !proxy.includes("referred-appeals"),
  },
  {
    name: "agent-clients allowed",
    ok: proxy.includes("agent-clients"),
  },
  {
    name: "no personal-meta in proxy",
    ok: !proxy.includes("personal-meta"),
  },
  {
    name: "fetch adapter documents BLOCKED",
    ok: readFileSync(path.join(root, "src/lib/clients-parity/fetch-observer-appeals.ts"), "utf8").includes(
      "BLOCKED_CONTRACT",
    ),
  },
];

let failed = 0;
for (const c of checks) {
  const status = c.ok ? "PASS" : "FAIL";
  if (!c.ok) failed += 1;
  console.log(`${status}\t${c.name}`);
}
process.exit(failed ? 1 : 0);
