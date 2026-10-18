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

export function assertSourceDigestUnchanged(cwd, label, before, after, extraAllowDirty = []) {
  if (before.head !== after.head) {
    throw new Error(`${label}: HEAD changed ${before.head.slice(0, 12)} -> ${after.head.slice(0, 12)}`);
  }
  if (before.digest === after.digest) return { ok: true, deltaFiles: [] };

  const porcelain = gitPorcelain(cwd);
  const deltaFiles = porcelain ? porcelain.split('\n').map((l) => l.slice(3)) : [];
  const allowed = [...GENERATED_PATH_ALLOWLIST, ...extraAllowDirty.map((p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))];
  const disallowed = deltaFiles.filter((f) => !allowed.some((re) => re.test(f.trim())));
  if (disallowed.length) {
    throw new Error(
      `${label}: uncommitted source drift after gate: ${disallowed.join(', ')} (digest ${before.digest.slice(0, 12)} != ${after.digest.slice(0, 12)})`,
    );
  }
  return { ok: true, deltaFiles, allowlistedGenerated: true };
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
