#!/usr/bin/env node
/** Single TAIL-01.3 evidence pass: vitest + catalog captures + PG raw (navigator side). */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitRevParse, countVitestPassed } from './lib/r06-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = path.resolve(ROOT, '../remcard-navigator');
const OUT = path.join(ROOT, 'artifacts/remcard-r06-specialist');
const RUN_DIR = process.env.R06_RUN_DIR || '/tmp/r06-tail-012b-1792326422';

function runNode(script, cwd, env) {
  const res = spawnSync('node', [script], { cwd, env, encoding: 'utf8' });
  return {
    exitCode: res.status ?? 1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const dbUrl = process.env.DATABASE_URL || 'postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test';
  const navPin = 'b52f98825f94972ec64962d26cc0df3ee43b59ca';
  const layoutCodePin = '11f512e44406d243261f7bfdd7c1d5d90f6494d9';
  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
    DIRECT_URL: dbUrl,
    R06_RUN_DIR: RUN_DIR,
    R06_EXPECT_NAV_SHA: navPin,
    R06_EXPECT_PLATFORM_CODE_SHA: layoutCodePin,
  };

  const vitest = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', 'src/lib/__tests__/taxonomyProposalRoute.integration.test.ts'],
    { cwd: NAV, env, encoding: 'utf8' },
  );
  const vitestOut = `${vitest.stdout || ''}\n${vitest.stderr || ''}`;
  const vitestPassed = countVitestPassed(vitestOut);

  const catalog = runNode('scripts/r06-tail-catalog-visual.mjs', ROOT, env);
  const pg = runNode('scripts/r06-tail-013-pg-evidence.mjs', NAV, env);

  let manifest = null;
  try {
    manifest = JSON.parse(
      readFileSync(
        path.join(OUT, 'screenshots/manifest-tail-01.3-catalog.json'),
        'utf8',
      ),
    );
  } catch {
    /* optional */
  }

  const summary = {
    task: 'R06-SPECIALIST-TAIL-01.3',
    capturedAt: new Date().toISOString(),
    git: {
      platformHead: gitRevParse(ROOT),
      navigatorHead: gitRevParse(NAV),
      layoutCodeSha: layoutCodePin,
      navigatorPin: navPin,
      platformBuiltHead: gitRevParse(ROOT),
    },
    vitest: {
      exitCode: vitest.status ?? 1,
      passed: vitestPassed,
      logTail: vitestOut.trim().slice(-4000),
    },
    catalogCapture: {
      exitCode: catalog.exitCode,
      stdout: catalog.stdout.trim(),
      stderr: catalog.stderr.trim(),
    },
    pgMigration: {
      exitCode: pg.exitCode,
      stdout: pg.stdout.trim(),
    },
    manifestCaptures: manifest?.captures?.map((c) => ({
      width: c.width,
      theme: c.theme,
      implSha256: c.implSha256,
      refSha256: c.refSha256,
    })),
  };

  const outPath = path.join(OUT, 'TAIL-01.3-EVIDENCE-SUMMARY.json');
  writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n');
  const ok =
    (vitest.status ?? 1) === 0 &&
    vitestPassed !== null &&
    vitestPassed >= 7 &&
    catalog.exitCode === 0 &&
    pg.exitCode === 0;
  console.log(JSON.stringify({ ok, outPath, summary: { vitest: summary.vitest, catalog: summary.catalogCapture, pg: summary.pgMigration } }));
  process.exit(ok ? 0 : 1);
}

main();
