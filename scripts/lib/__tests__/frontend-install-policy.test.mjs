import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { assertFrontendInstallPolicy } from '../../check-frontend-install-policy.mjs';

function fixture(fn, { pkg = {}, lock = {} } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'frontend-install-policy-'));
  const manifest = { name: 'fixture', version: '1', dependencies: { react: '18.3.1' }, ...pkg };
  writeFileSync(path.join(root, 'package.json'), JSON.stringify(manifest));
  writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({
    lockfileVersion: 3, packages: { '': manifest }, ...lock,
  }));
  try { fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('actual frontend uses only the matching npm lockfile', () => {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  assert.equal(assertFrontendInstallPolicy(root).manager, 'npm');
});
test('accepts matching npm manifests', () => fixture(root => assert.equal(assertFrontendInstallPolicy(root).ok, true)));
for (const conflict of ['pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb']) {
  test(`rejects competing ${conflict}`, () => fixture(root => {
    writeFileSync(path.join(root, conflict), '');
    assert.throws(() => assertFrontendInstallPolicy(root), /competing_lockfiles/);
  }));
}
test('rejects missing package-lock', () => fixture(root => {
  rmSync(path.join(root, 'package-lock.json'));
  assert.throws(() => assertFrontendInstallPolicy(root), /ENOENT/);
}));
test('rejects dependency spec drift', () => fixture(root => {
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: 'fixture', version: '1', dependencies: { react: '19' },
  }));
  assert.throws(() => assertFrontendInstallPolicy(root), /lock_manifest_mismatch:dependencies/);
}));
test('rejects invalid lockfile version', () => fixture(root => {
  assert.throws(() => assertFrontendInstallPolicy(root), /invalid_npm_lockfile/);
}, { lock: { lockfileVersion: 9 } }));
test('rejects non-npm packageManager', () => fixture(root => {
  assert.throws(() => assertFrontendInstallPolicy(root), /package_manager_not_npm/);
}, { pkg: { packageManager: 'pnpm@12.14.0' } }));
