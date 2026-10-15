#!/usr/bin/env node
/** HTTP smoke: gate off keeps legacy basics visible (no wizard). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_DIR = process.env.R02_RUN_DIR || '/tmp/r02-local-stack';

async function main() {
  const session = JSON.parse(readFileSync(path.join(RUN_DIR, 'session.json'), 'utf8'));
  const plat = session.platformOrigin.replace(/\/$/, '');
  const cookie = `remcard-token=${session.token}`;
  const status = await fetch(`${plat}/api/remcard/api/pro/agent-profile/status`, {
    headers: { Cookie: cookie },
  });
  const statusBody = await status.json();
  const page = await fetch(`${plat}/profile?section=basics`, { headers: { Cookie: cookie } });
  const html = await page.text();
  const legacy = html.includes('data-profile-focus="displayName"');
  const wizard = html.includes('agent-profile-wizard');
  const ok = status.status === 200 && statusBody.featureEnabled === false && legacy && !wizard;
  console.log(
    JSON.stringify({
      ok,
      status: status.status,
      featureEnabled: statusBody.featureEnabled,
      legacyMarker: legacy,
      wizardMarker: wizard,
    }),
  );
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
