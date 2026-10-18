/** Source cleanliness + isolated build gates for unified prep evidence (no prod). */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const PLAT_EVIDENCE_DIST = '.next-unified-prep-evidence';
export const NAV_EVIDENCE_DIST = '.next-unified-prep-evidence';

/** Paths that may change during harness without failing source gate (recorded, not restored blindly). */
export const GENERATED_PATH_ALLOWLIST = [
  /^tsconfig\.tsbuildinfo$/,
  /^\.next-unified-prep-evidence\//,
  /^\.next-r06-local-/,
  /^\.next\//,
];

export function gitHead(cwd) {
  return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
}

export function gitPorcelain(cwd) {
  return execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trimEnd();
}

export function porcelainPaths(porcelain) {
  if (!porcelain) return [];
  return porcelain.split('\n').filter(Boolean).map((line) => {
    if (line.startsWith('??')) return line.slice(3).trim();
    if (line.length >= 3 && line[2] === ' ') return line.slice(3).trim();
    if (line.length >= 2 && line[1] === ' ') return line.slice(2).trim();
    return line.trim();
  });
}

export function gitDirty(cwd) {
  const out = gitPorcelain(cwd);
  return { dirty: Boolean(out), files: out ? out.split('\n') : [] };
}

export function assertCleanCommittedTree(cwd) {
  if (gitDirty(cwd).dirty) throw new Error('refusing evidence: dirty source tree');
  return gitHead(cwd);
}

export function assertSuccessfulCommand(result, label) {
  if (result.spawnError || result.signal || result.exitCode !== 0) {
    throw new Error(`${label} failed: ${result.spawnError || result.signal || result.exitCode}`);
  }
}

/** Digest of tracked source paths (excludes artifacts/ evidence outputs). */
export function trackedSourceDigest(cwd, { excludeArtifacts = true } = {}) {
  const list = execSync('git ls-files -z', { cwd, encoding: 'buffer' });
  const files = list.toString('utf8').split('\0').filter(Boolean);
  const h = createHash('sha256');
  const included = [];
  const hashes = {};
  for (const rel of files.sort()) {
    if (excludeArtifacts && rel.startsWith('artifacts/')) continue;
    if (rel.startsWith('node_modules/')) continue;
    const abs = path.join(cwd, rel);
    if (!existsSync(abs)) continue;
    h.update(rel);
    h.update('\0');
    h.update(readFileSync(abs));
    h.update('\0');
    included.push(rel);
    hashes[rel] = createHash('sha256').update(readFileSync(abs)).digest('hex');
  }
  return { digest: h.digest('hex'), fileCount: included.length, head: gitHead(cwd), hashes };
}

/** Next.js may append isolated-dist types glob to tsconfig include during builds. Allow only that delta vs HEAD. */
export function tsconfigIncludeDistDriftOk(cwd, distDir) {
  const rel = 'tsconfig.json';
  const abs = path.join(cwd, rel);
  if (!existsSync(abs)) return { ok: false, reason: 'tsconfig missing' };
  let committed;
  try {
    committed = JSON.parse(execSync('git show HEAD:tsconfig.json', { cwd, encoding: 'utf8' }));
  } catch {
    return { ok: false, reason: 'no committed tsconfig.json' };
  }
  let current;
  try { current = JSON.parse(readFileSync(abs, 'utf8')); }
  catch { return { ok: false, reason: 'invalid tsconfig JSON' }; }
  const distInclude = `${distDir}/types/**/*.ts`;
  if (!Array.isArray(current.include) || !Array.isArray(committed.include)) {
    return { ok: false, reason: 'tsconfig include must be an array' };
  }
  const allowedAdditions = new Set([
    distInclude,
    '.next-r06-local-nav/types/**/*.ts',
    '.next-r06-local-plat/types/**/*.ts',
  ]);
  const normalized = {
    ...current,
    include: current.include.filter(x => !allowedAdditions.has(x) || committed.include.includes(x)),
  };
  if (!isDeepStrictEqual(normalized, committed)) {
    return { ok: false, reason: 'tsconfig changed beyond explicit generated dist additions' };
  }
  const body = readFileSync(abs);
  return {
    ok: true,
    path: rel,
    allowReason: 'next_isolated_dist_types_include',
    distInclude,
    sha256: createHash('sha256').update(body).digest('hex'),
    addedIncludes: current.include.filter(x => !committed.include.includes(x)),
  };
}

function generatedNextEnvOk(cwd) {
  const text = readFileSync(path.join(cwd, 'next-env.d.ts'), 'utf8');
  const allowed = line => !line.trim() || line.trim().startsWith('// ') ||
    /^\/\/\/ <reference types="next(?:\/image-types\/global)?" \/>$/.test(line) ||
    /^\/\/\/ <reference path="\.\/\.next(?:-unified-prep-evidence|-r06-local-(?:nav|plat))?\/types\/routes\.d\.ts" \/>$/.test(line) ||
    /^import "\.\/\.next(?:-unified-prep-evidence|-r06-local-(?:nav|plat))?\/types\/routes\.d\.ts";?$/.test(line);
  return { ok: text.split(/\r?\n/).every(allowed), path: 'next-env.d.ts',
    sha256: createHash('sha256').update(text).digest('hex') };
}

export function assertSourceDigestUnchanged(cwd, label, before, after, extraAllowDirty = [], fileCheck = null) {
  if (before.head !== after.head) {
    throw new Error(`${label}: HEAD changed ${before.head.slice(0, 12)} -> ${after.head.slice(0, 12)}`);
  }
  if (!before.hashes && before.digest === after.digest) return { ok: true, deltaFiles: [] };

  const porcelain = gitPorcelain(cwd);
  const sourceChanges = before.hashes && after.hashes
    ? [...new Set([...Object.keys(before.hashes), ...Object.keys(after.hashes)])]
        .filter(f => before.hashes[f] !== after.hashes[f])
    : porcelainPaths(porcelain);
  const untracked = porcelain.split('\n').filter(l => l.startsWith('?? '))
    .map(l => l.slice(3).trim()).filter(f => !f.startsWith('artifacts/'));
  const deltaFiles = [...new Set([...sourceChanges, ...untracked])];
  const allowed = [...GENERATED_PATH_ALLOWLIST, ...extraAllowDirty.map((p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))];
  const allowlistedFileChecks = [];
  const disallowed = deltaFiles.filter((f) => {
    const t = f.trim();
    if (allowed.some((re) => re.test(t))) return false;
    if (t === 'next-env.d.ts' && existsSync(path.join(cwd, t))) {
      const verdict = generatedNextEnvOk(cwd);
      if (verdict.ok) { allowlistedFileChecks.push(verdict); return false; }
    }
    if (fileCheck) {
      const verdict = fileCheck(t);
      if (verdict?.ok) {
        allowlistedFileChecks.push(verdict);
        return false;
      }
    }
    return true;
  });
  if (disallowed.length) {
    throw new Error(
      `${label}: uncommitted source drift after gate: ${disallowed.join(', ')} (digest ${before.digest.slice(0, 12)} != ${after.digest.slice(0, 12)})`,
    );
  }
  if (before.digest !== after.digest && deltaFiles.length === 0) {
    throw new Error(`${label}: source digest changed without explained file delta`);
  }
  return { ok: true, deltaFiles, allowlistedGenerated: true, allowlistedFileChecks };
}

export function removeDistForCleanBuild(cwd, distDir) {
  const full = path.join(cwd, distDir);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
  }
  const legacy = path.join(cwd, '.next');
  if (distDir !== '.next' && existsSync(legacy)) {
    rmSync(legacy, { recursive: true, force: true });
  }
}

export function readBuildIdFresh(cwd, distDir, buildStartedAtMs) {
  const p = path.join(cwd, distDir, 'BUILD_ID');
  if (!existsSync(p)) {
    throw new Error(`BUILD_ID missing at ${p}`);
  }
  const st = statSync(p);
  if (st.mtimeMs < buildStartedAtMs - 500) {
    throw new Error(`stale BUILD_ID: mtime ${st.mtimeMs} before build start ${buildStartedAtMs}`);
  }
  const id = readFileSync(p, 'utf8').trim();
  if (!id) throw new Error('empty BUILD_ID');
  return { id, mtimeMs: st.mtimeMs, path: p };
}
