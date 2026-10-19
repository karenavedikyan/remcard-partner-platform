/** Shared MOCK stack build + provenance for R06 catalog-prefill runners. */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitRevParse, readNextBuildId } from './r06-provenance.mjs';

export async function probeRuntimeBuildId(origin, buildIdHint) {
  if (buildIdHint) {
    const manifestUrl = `${origin}/_next/static/${buildIdHint}/_buildManifest.js`;
    const manifestRes = await fetch(manifestUrl, { signal: AbortSignal.timeout(8000) });
    if (manifestRes.ok) return buildIdHint;
  }
  const res = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(12000) });
  const html = await res.text();
  const match = html.match(/"buildId":"([^"]+)"/);
  if (!match) throw new Error('runtime_build_id_not_found');
  return match[1];
}

export function gitDirtyTracked(cwd) {
  const out = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd,
    encoding: 'utf8',
  });
  const text = (out.stdout || '').trim();
  if (!text) return { dirty: false, files: [] };
  return { dirty: true, files: text.split('\n').filter(Boolean) };
}

export function assertCleanTree(repoRoot) {
  const dirty = gitDirtyTracked(repoRoot);
  if (dirty.dirty) {
    throw new Error(`tree_dirty:${dirty.files.join(';')}`);
  }
}

export function sourceTreeDigest(repoRoot) {
  const tree = spawnSync('git', ['write-tree'], { cwd: repoRoot, encoding: 'utf8' });
  if (tree.status !== 0) throw new Error('git_write_tree_failed');
  return tree.stdout.trim();
}

export function pinProductionEnvLocal(repoRoot, appOrigin, mockBaseUrl) {
  const prodEnvLocal = path.join(repoRoot, '.env.production.local');
  let backup = null;
  try {
    backup = existsSync(prodEnvLocal) ? readFileSync(prodEnvLocal, 'utf8') : null;
  } catch {
    backup = null;
  }
  writeFileSync(
    prodEnvLocal,
    `REMCARD_API_BASE_URL=${mockBaseUrl}\nNEXT_PUBLIC_APP_URL=${appOrigin}\nREMCARD_PROXY_TRUST_LOOPBACK_ORIGIN=1\n`,
  );
  return {
    restore() {
      if (backup == null) {
        try {
          if (existsSync(prodEnvLocal)) unlinkSync(prodEnvLocal);
        } catch {
          /* ignore */
        }
        return;
      }
      writeFileSync(prodEnvLocal, backup);
    },
  };
}

/**
 * @returns {{ status: 'ok'|'skipped'|'failed', exitCode: number|null, buildId: string|null, stdout: string, stderr: string }}
 */
export function runIsolatedPlatformBuild(repoRoot, distDir, { skipIfEnv = 'R06_SKIP_BUILD' } = {}) {
  const buildIdPath = path.join(repoRoot, distDir, 'BUILD_ID');
  const skipBuild = process.env[skipIfEnv] === '1' && existsSync(buildIdPath);
  if (skipBuild) {
    return {
      status: 'skipped',
      exitCode: null,
      buildId: readFileSync(buildIdPath, 'utf8').trim(),
      stdout: '',
      stderr: '',
    };
  }
  assertCleanTree(repoRoot);
  const buildCmd = `npm ci --include=dev && env -u R06_NEXT_DIST_DIR LOGIN_ENTRY_NEXT_DIST_DIR=${JSON.stringify(distDir)} npm run build`;
  const build = spawnSync('bash', ['-lc', buildCmd], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
  });
  const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, 'utf8').trim() : null;
  if (build.status !== 0 || !buildId) {
    return {
      status: 'failed',
      exitCode: build.status ?? 1,
      buildId,
      stdout: build.stdout ?? '',
      stderr: build.stderr ?? '',
    };
  }
  return {
    status: 'ok',
    exitCode: 0,
    buildId,
    stdout: build.stdout ?? '',
    stderr: build.stderr ?? '',
  };
}

export function collectPrefillProvenance(repoRoot, distDir) {
  const dirty = gitDirtyTracked(repoRoot);
  return {
    codeSha: gitRevParse(repoRoot),
    sourceTreeDigest: sourceTreeDigest(repoRoot),
    treeDirty: dirty.dirty,
    treeDirtyFiles: dirty.files,
    distDir,
    buildIdFromDist: readNextBuildId(repoRoot, distDir),
  };
}
