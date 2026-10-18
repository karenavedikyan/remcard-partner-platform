import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assertSourceDigestUnchanged,
  porcelainPaths,
  readBuildIdFresh,
  removeDistForCleanBuild,
  trackedSourceDigest,
  tsconfigIncludeDistDriftOk,
  assertCleanCommittedTree,
  assertSuccessfulCommand,
} from '../unified-prep-source-gates.mjs';

describe('unified-prep evidence gates', () => {
  it('readBuildIdFresh rejects stale BUILD_ID mtime', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'unified-gate-'));
    const dist = path.join(dir, 'dist');
    mkdirSync(dist, { recursive: true });
    writeFileSync(path.join(dist, 'BUILD_ID'), 'old-id\n');
    const now = Date.now();
    assert.throws(
      () => readBuildIdFresh(dir, 'dist', now + 60_000),
      /stale BUILD_ID/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it('readBuildIdFresh accepts BUILD_ID written after build start', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'unified-gate-'));
    const dist = path.join(dir, 'dist');
    mkdirSync(dist, { recursive: true });
    const started = Date.now();
    writeFileSync(path.join(dist, 'BUILD_ID'), 'fresh-id\n');
    const r = readBuildIdFresh(dir, 'dist', started);
    assert.equal(r.id, 'fresh-id');
    rmSync(dir, { recursive: true, force: true });
  });

  it('removeDistForCleanBuild removes isolated dist', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'unified-gate-'));
    const dist = path.join(dir, '.next-unified-prep-evidence');
    mkdirSync(dist, { recursive: true });
    writeFileSync(path.join(dist, 'BUILD_ID'), 'x');
    removeDistForCleanBuild(dir, '.next-unified-prep-evidence');
    assert.throws(() => readBuildIdFresh(dir, '.next-unified-prep-evidence', Date.now()), /BUILD_ID missing/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('porcelainPaths parses single-column M path lines', () => {
    const paths = porcelainPaths('M next-env.d.ts\n M tsconfig.json\n?? .next-unified-prep-evidence/');
    assert.deepEqual(paths, ['next-env.d.ts', 'tsconfig.json', '.next-unified-prep-evidence/']);
  });

  it('readBuildIdFresh rejects missing BUILD_ID', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'unified-gate-'));
    assert.throws(() => readBuildIdFresh(dir, 'dist', Date.now()), /BUILD_ID missing/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('readBuildIdFresh rejects empty BUILD_ID', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'unified-gate-'));
    const dist = path.join(dir, 'dist');
    mkdirSync(dist, { recursive: true });
    writeFileSync(path.join(dist, 'BUILD_ID'), '   \n');
    const started = Date.now();
    assert.throws(() => readBuildIdFresh(dir, 'dist', started), /empty BUILD_ID/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('assertSourceDigestUnchanged fails on HEAD change', () => {
    assert.throws(
      () =>
        assertSourceDigestUnchanged(
          process.cwd(),
          'test',
          { head: 'aaa', digest: 'd1' },
          { head: 'bbb', digest: 'd1' },
        ),
      /HEAD changed/,
    );
  });

  it('assertSourceDigestUnchanged passes when digest unchanged', () => {
    const r = assertSourceDigestUnchanged(
      process.cwd(),
      'test',
      { head: 'aaa', digest: 'same' },
      { head: 'aaa', digest: 'same' },
    );
    assert.equal(r.ok, true);
  });

});

function fixture(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'unified-source-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  const write = (name, value) => writeFileSync(path.join(dir, name), value);
  const config = { compilerOptions: { strict: true }, include: ['src/a.ts'], exclude: ['node_modules'] };
  try {
    git('init', '-q');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    mkdirSync(path.join(dir, 'src'));
    write('src/a.ts', 'export const a = 1;\n');
    write('tsconfig.json', JSON.stringify(config));
    write('next-env.d.ts', '/// <reference types="next" />\n');
    git('add', '.'); git('commit', '-qm', 'fixture');
    fn({ dir, git, write, config });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe('source gates on temporary git fixtures', () => {
  it('accepts clean start and rejects dirty start', () => fixture(({ dir, write }) => {
    assert.ok(assertCleanCommittedTree(dir));
    write('src/a.ts', 'changed');
    assert.throws(() => assertCleanCommittedTree(dir), /dirty/);
  }));
  it('rejects source edit without HEAD change', () => fixture(({ dir, write }) => {
    const before = trackedSourceDigest(dir);
    write('src/a.ts', 'changed');
    assert.throws(() => assertSourceDigestUnchanged(dir, 'test', before, trackedSourceDigest(dir)), /source drift/);
  }));
  it('rejects untracked source addition even with same tracked digest', () => fixture(({ dir, write }) => {
    const before = trackedSourceDigest(dir);
    write('src/new.ts', 'changed');
    assert.throws(() => assertSourceDigestUnchanged(dir, 'test', before, trackedSourceDigest(dir)), /source drift/);
  }));
  it('allows only known generated include additions', () => fixture(({ dir, write, config }) => {
    const before = trackedSourceDigest(dir);
    write('tsconfig.json', JSON.stringify({ ...config, include: [...config.include, '.next-unified-prep-evidence/types/**/*.ts'] }));
    const check = f => f === 'tsconfig.json' ? tsconfigIncludeDistDriftOk(dir, '.next-unified-prep-evidence') : { ok: false };
    assert.equal(check('tsconfig.json').ok, true);
    assert.equal(assertSourceDigestUnchanged(dir, 'test', before, trackedSourceDigest(dir), [], check).ok, true);
  }));
  for (const mutation of ['strict', 'exclude', 'foreignInclude', 'removeInclude']) {
    it(`rejects tsconfig ${mutation} drift`, () => fixture(({ dir, git, write, config }) => {
      const before = trackedSourceDigest(dir);
      const next = structuredClone(config);
      next.include.push('.next-unified-prep-evidence/types/**/*.ts');
      if (mutation === 'strict') next.compilerOptions.strict = false;
      if (mutation === 'exclude') next.exclude.push('src/**');
      if (mutation === 'foreignInclude') next.include.push('.next-foreign/types/**/*.ts');
      if (mutation === 'removeInclude') next.include.shift();
      write('tsconfig.json', JSON.stringify(next));
      git('add', 'tsconfig.json');
      const check = f => f === 'tsconfig.json' ? tsconfigIncludeDistDriftOk(dir, '.next-unified-prep-evidence') : { ok: false };
      assert.equal(check('tsconfig.json').ok, false);
      assert.throws(() => assertSourceDigestUnchanged(dir, 'test', before, trackedSourceDigest(dir), [], check), /source drift/);
    }));
  }
  it('rejects executable changes in generated next-env', () => fixture(({ dir, write }) => {
    const before = trackedSourceDigest(dir);
    write('next-env.d.ts', 'import "foreign-module";\n');
    assert.throws(() => assertSourceDigestUnchanged(dir, 'test', before, trackedSourceDigest(dir)), /source drift/);
  }));
  it('accepts approved next-env declaration and records its hash', () => fixture(({ dir, write }) => {
    const before = trackedSourceDigest(dir);
    write('next-env.d.ts', '/// <reference types="next" />\n/// <reference path="./.next-unified-prep-evidence/types/routes.d.ts" />\n');
    const report = assertSourceDigestUnchanged(dir, 'test', before, trackedSourceDigest(dir));
    assert.equal(report.ok, true);
    assert.ok(report.allowlistedFileChecks[0].sha256);
  }));
  it('rejects failed install/build, spawn error and signal', () => {
    for (const failure of [{ exitCode: 1 }, { exitCode: 0, spawnError: 'ENOENT' }, { exitCode: 0, signal: 'SIGTERM' }]) {
      assert.throws(() => assertSuccessfulCommand(failure, 'build'), /failed/);
    }
    assert.doesNotThrow(() => assertSuccessfulCommand({ exitCode: 0 }, 'build'));
  });
});
