#!/usr/bin/env node
/** Targeted 01.2 recapture against a running impl (spawned next start). */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureLoginEntryTargets, parseCaptureTargetSpec } from "./login-entry-capture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_UNPACK = process.env.LOGIN_ENTRY_REF_DIR || "/tmp/login-entry-prototype-unpack";
const SHOTS = path.join(__dirname, "screenshots");
const implOrigin = process.env.LOGIN_ENTRY_IMPL_ORIGIN || "http://127.0.0.1:31997";
const targetSpec =
  process.env.LOGIN_ENTRY_CAPTURE_TARGETS?.trim() ||
  "provider:375:dark,provider:320:dark,provider:375:light,provider:320:light,admin-modal:320:dark,admin-modal:320:light,admin-modal:375:light";

const refServer = spawn("npx", ["--yes", "serve", REF_UNPACK, "-l", "3098"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch({ headless: true });
try {
  const result = await captureLoginEntryTargets({
    browser,
    refOrigin: "http://127.0.0.1:3098",
    implOrigin,
    shotsDir: SHOTS,
    targets: parseCaptureTargetSpec(targetSpec),
  });
  result.targetSpec = targetSpec;
  result.implOrigin = implOrigin;
  writeFileSync(path.join(__dirname, "login-entry-recapture-01-2.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  refServer.kill("SIGTERM");
}
