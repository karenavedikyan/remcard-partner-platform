/** Source cleanliness + isolated build gates for unified prep evidence (no prod). */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

export const PLAT_EVIDENCE_DIST = '.next-unified-prep-evidence';
export const NAV_EVIDENCE_DIST = '.next-unified-prep-evidence';

/** Paths that may change during harness without failing source gate (recorded, not restored blindly). */
export const GENERATED_PATH_ALLOWLIST = [
  /^next-env\.d\.ts$/,
  /^tsconfig\.tsbuildinfo$/,
  /^\.next-unified-prep-evidence\//,
  /^\.next-r06-local-/,
  /^\.next\//,
];

export function gitHead(cwd) {
  return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
}

export function gitPorcelain(cwd) {
  return execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
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

/** Digest of tracked source paths (excludes artifacts/ evidence outputs). */
export function trackedSourceDigest(cwd, { excludeArtifacts = true } = {}) {
  const list = execSync('git ls-files -z', { cwd, encoding: 'buffer' });
  const files = list.toString('utf8').split('\0').filter(Boolean);
  const h = createHash('sha256');
  const included = [];
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
  }
  return { digest: h.digest('hex'), fileCount: included.length, head: gitHead(cwd) };
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
  const current = JSON.parse(readFileSync(abs, 'utf8'));
  const distInclude = `${distDir}/types/**/*.ts`;
  const stripNextTypeIncludes = (arr) =>
    (arr ?? []).filter(
      (x) => !(typeof x === 'string' && /^\.next[^/]*\/types\/\*\*\/\*\.ts$/.test(x)),
    );
  const baseCommitted = stripNextTypeIncludes(committed.include).slice().sort();
  const baseCurrent = stripNextTypeIncludes(current.include).slice().sort();
  if (JSON.stringify(baseCommitted) !== JSON.stringify(baseCurrent)) {
    return { ok: false, reason: 'tsconfig include changed beyond next dist types', baseCommitted, baseCurrent };
  }
  const typeIncludes = (current.include ?? []).filter(
    (x) => typeof x === 'string' && /^\.next[^/]*\/types\/\*\*\/\*\.ts$/.test(x),
  );
  if (!typeIncludes.includes(distInclude)) {
    return { ok: false, reason: `tsconfig missing allowlisted include ${distInclude}`, typeIncludes };
  }
  const body = readFileSync(abs);
  return {
    ok: true,
    path: rel,
    allowReason: 'next_isolated_dist_types_include',
    distInclude,
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

export function assertSourceDigestUnchanged(cwd, label, before, after, extraAllowDirty = [], fileCheck = null) {
  if (before.head !== after.head) {
    throw new Error(`${label}: HEAD changed ${before.head.slice(0, 12)} -> ${after.head.slice(0, 12)}`);
  }
  if (before.digest === after.digest) return { ok: true, deltaFiles: [] };

  const porcelain = gitPorcelain(cwd);
  const deltaFiles = porcelainPaths(porcelain);
  const allowed = [...GENERATED_PATH_ALLOWLIST, ...extraAllowDirty.map((p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))];
  const allowlistedFileChecks = [];
  const disallowed = deltaFiles.filter((f) => {
    const t = f.trim();
    if (allowed.some((re) => re.test(t))) return false;
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
