#!/usr/bin/env node
/** Dependency-install policy only. Does not install packages or contact production. */
import { existsSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertFrontendInstallPolicy(root) {
  // Timeweb checks yarn/pnpm before package-lock. Keep one authoritative lockfile.
  const conflicts = ['yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb']
    .filter(file => existsSync(path.join(root, file)));
  if (conflicts.length) throw new Error(`competing_lockfiles:${conflicts.join(',')}`);
  const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  const pkg = read('package.json');
  const lock = read('package-lock.json');
  if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error('invalid_npm_lockfile');
  const locked = lock.packages[''];
  if (pkg.name !== locked.name || pkg.version !== locked.version) throw new Error('lock_identity_mismatch');
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    if (!isDeepStrictEqual(pkg[key] ?? {}, locked[key] ?? {})) throw new Error(`lock_manifest_mismatch:${key}`);
  }
  if (pkg.packageManager && !pkg.packageManager.startsWith('npm@')) throw new Error('package_manager_not_npm');
  return { ok: true, manager: 'npm', lockfile: 'package-lock.json', install: 'npm ci --include=dev' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(assertFrontendInstallPolicy(path.resolve(fileURLToPath(new URL('..', import.meta.url))))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
