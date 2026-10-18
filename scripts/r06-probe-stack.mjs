#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeRunStack } from './lib/r06-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R06_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-local-stack';

const expectNavigatorSha =
  process.env.R06_EXPECT_NAV_SHA || '04613f09400b54c894fa192a81b09834c8797fd5';
const expectPlatformCodeSha =
  process.env.R06_EXPECT_PLATFORM_CODE_SHA || 'e18487ad634e9a8e33ebbb08d55eb16aa3b8d889';

async function main() {
  const { report } = await probeRunStack({
    runDir: RUN_DIR,
    navRoot: NAV_ROOT,
    platRoot: ROOT,
    expectNavigatorSha,
    expectPlatformCodeSha,
  });
  console.log(JSON.stringify({ ok: true, report }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message, report: e.report ?? null }));
  process.exit(1);
});
