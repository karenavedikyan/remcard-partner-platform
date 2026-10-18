import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  assertSourceDigestUnchanged,
  porcelainPaths,
  readBuildIdFresh,
  removeDistForCleanBuild,
  trackedSourceDigest,
} from '../unified-prep-source-gates.mjs';
import { validateExpectedNegative } from '../../../../remcard-navigator/scripts/lib/spawn-run-record.mjs';

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

  it('validateExpectedNegative prefix/suffix token fails strict match', () => {
    const runResult = {
      command: 'probe',
      spawnError: null,
      signal: null,
      status: 1,
      exitCode: 1,
      stdout: JSON.stringify({ ok: false, blockers: ['x_parsed_port_mismatch_y'] }),
      stderr: '',
    };
    const v = validateExpectedNegative(runResult, {
      name: 'probe',
      expectExit: 1,
      expectBlockers: ['parsed_port_mismatch'],
    });
    assert.equal(v.ok, false);
  });
});
