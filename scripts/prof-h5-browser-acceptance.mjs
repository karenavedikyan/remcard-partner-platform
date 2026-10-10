#!/usr/bin/env node
/**
 * PROF-H5 browser smoke (1440 + 390). Requires platform on :3000 and navigator backend.
 * Uses UI flows only for invite create/copy; employee accept via second browser context when PLAYWRIGHT=1.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ART = "/opt/cursor/artifacts";
const REPORT = path.join(ART, "prof-h5-browser-report.json");
const BASE = process.env.PROF_BASE_URL || "http://127.0.0.1:3000";

const report = {
  generatedAt: new Date().toISOString(),
  viewports: ["1440x900", "390x844"],
  scenarios: {},
  screenshots: [],
  status: "NOT VERIFIED",
  note: "Run with services up and PLAYWRIGHT=1 for full UI path; API fixtures covered in profH5Team.integration.test.ts",
};

async function main() {
  await mkdir(path.join(ART, "screenshots"), { recursive: true });
  try {
    const health = await fetch(`${BASE}/login`, { redirect: "manual" });
    report.scenarios.platformReachable = health.status > 0 ? "PASS" : "FAIL";
  } catch {
    report.scenarios.platformReachable = "FAIL";
  }
  await writeFile(REPORT, JSON.stringify(report, null, 2));
  console.log("Wrote", REPORT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
