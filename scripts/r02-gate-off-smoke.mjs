#!/usr/bin/env node
/** HTTP smoke: gate off keeps legacy basics visible (no wizard). Writes gate-off auth evidence. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';
const ARTIFACT = path.join(ROOT, 'artifacts/remcard-r02/local-auth-evidence-gate-off.json');

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main() {
  const session = JSON.parse(readFileSync(path.join(RUN_DIR, 'session.json'), 'utf8'));
  const plat = session.platformOrigin.replace(/\/$/, '');
  const cookie = `remcard-token=${session.token}`;
  const report = { ok: false, gate: 'off', steps: {} };
  report.steps.bffStatus = await fetchJson(`${plat}/api/remcard/api/pro/agent-profile/status`, {
    headers: { Cookie: cookie },
  });
  report.steps.bffDraft = await fetchJson(`${plat}/api/remcard/api/pro/agent-profile/draft`, {
    headers: { Cookie: cookie },
  });
  const page = await fetch(`${plat}/profile?section=basics`, { headers: { Cookie: cookie } });
  const html = await page.text();
  report.steps.legacyUi = {
    status: page.status,
    legacyMarker: html.includes('data-profile-focus="displayName"'),
    wizardMarker: html.includes('agent-profile-wizard'),
  };
  report.ok =
    report.steps.bffStatus.status === 200 &&
    report.steps.bffStatus.body?.featureEnabled === false &&
    report.steps.bffDraft.status === 403 &&
    report.steps.legacyUi.legacyMarker &&
    !report.steps.legacyUi.wizardMarker;
  mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  writeFileSync(ARTIFACT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, artifact: ARTIFACT }));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
