#!/usr/bin/env node
/**
 * R06.3 A/B/C — disposable stack + probe + frontend evidence (provenance-safe).
 * Does not touch production or unrelated ports except R06_NAV_PORT / R06_PLATFORM_PORT.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  countVitestPassed,
  gitRevParse,
  loadRunMeta,
  probeRunStack,
  runCmd,
  writeJson,
} from './lib/r06-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_ROOT = process.env.R06_NAVIGATOR_DIR || path.resolve(ROOT, '../remcard-navigator');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts/remcard-r06-specialist');
const RUN_DIR =
  process.env.R06_RUN_DIR ||
  `/tmp/r06-abc-evidence-${Date.now().toString(36)}`;
const EXPECT_NAV = '04613f09400b54c894fa192a81b09834c8797fd5';
const EXPECT_PLAT_CODE = 'e18487ad634e9a8e33ebbb08d55eb16aa3b8d889';

const sharedEnv = {
  ...process.env,
  R06_RUN_DIR: RUN_DIR,
  R06_EXPECT_NAV_SHA: EXPECT_NAV,
  R06_EXPECT_PLATFORM_CODE_SHA: EXPECT_PLAT_CODE,
  NODE_ENV: 'test',
};

function runNode(script, extraEnv = {}) {
  return runCmd(['node', script], ROOT, { ...sharedEnv, ...extraEnv });
}

async function main() {
  mkdirSync(RUN_DIR, { recursive: true });
  writeJson(path.join(ARTIFACT_DIR, 'PROVENANCE-MISMATCH-ROOT-CAUSE.json'), {
    incident: 'R06.3 A/B/C manifest runtime SHA mismatch (c0996e1 review)',
    cause:
      'PNG capture used manually restarted next start with e18487a dist while /tmp/r06-local-stack/meta.json still held an older stack (platform f898f272, navigator 98749816). r06-visual-pairs.mjs originally wrote navigatorSha/platformSha from that stale meta; c0996e1 patched JSON by hand — not acceptable provenance.',
    staleMetaEvidencePath: '/tmp/r06-local-stack/meta.json',
    staleValues: {
      platformSha: 'f898f2727e0333701d8ae314d42208f018792dae',
      navigatorSha: '98749816d0fa4f1722aac0c53e1e10b68ca3bdac',
    },
    remediation: 'New R06_RUN_DIR + stack meta.runtime + probe before BFF/visual; manifest from meta only',
    remediatedAt: new Date().toISOString(),
  });

  const log = [];
  const stack = runNode('scripts/r06-local-stack.mjs');
  log.push({ cmd: 'node scripts/r06-local-stack.mjs', exitCode: stack.exitCode });
  if (stack.exitCode !== 0) {
    writeFileSync(path.join(RUN_DIR, 'evidence-rerun.log.json'), JSON.stringify({ ok: false, log }, null, 2));
    process.exit(stack.exitCode);
  }

  const { report: probeReport } = await probeRunStack({
    runDir: RUN_DIR,
    navRoot: NAV_ROOT,
    platRoot: ROOT,
    expectNavigatorSha: EXPECT_NAV,
    expectPlatformCodeSha: EXPECT_PLAT_CODE,
  });
  log.push({ cmd: 'probeRunStack', exitCode: 0, report: probeReport });

  const component = runCmd(
    [
      'pnpm',
      'exec',
      'vitest',
      'run',
      'src/components/profile/ProfileDirectionsPicker',
      'src/components/profile/CatalogPublicationPreview',
      'src/components/profile/specialist/SpecialistCatalogSection',
      'src/components/profile/specialist/SpecialistWorkingProfileWizard.version',
      'src/lib/profile-save.submit.test.tsx',
    ],
    ROOT,
    sharedEnv,
  );
  log.push({
    cmd: 'pnpm exec vitest run (12 component tests incl. profile-save)',
    exitCode: component.exitCode,
    testsPassed: countVitestPassed(component.stdout),
    stdoutTail: component.stdout.split('\n').slice(-8).join('\n'),
  });

  const acceptance = runNode('scripts/r06-local-acceptance.mjs');
  log.push({ cmd: 'node scripts/r06-local-acceptance.mjs', exitCode: acceptance.exitCode });

  const meta = loadRunMeta(RUN_DIR);
  const runnerHead = gitRevParse(ROOT);
  const ok =
    stack.exitCode === 0 &&
    component.exitCode === 0 &&
    acceptance.exitCode === 0;

  writeJson(path.join(RUN_DIR, 'evidence-rerun.log.json'), {
    ok,
    runDir: RUN_DIR,
    log,
    runnerPlatformGitHead: runnerHead,
    metaPath: path.join(RUN_DIR, 'meta.json'),
  });

  console.log(JSON.stringify({ ok, runDir: RUN_DIR }));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
