/** R06 disposable stack: git + BUILD_ID facts and pin verification (no manual SHA edits). */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

export function gitRevParse(cwd) {
  return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
}

export function gitBranch(cwd) {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
}

export function gitDirty(cwd) {
  const out = execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
  if (!out) return { dirty: false, files: [] };
  return { dirty: true, files: out.split('\n').filter(Boolean) };
}

export function readNextBuildId(repoRoot, distDirName) {
  const p = path.join(repoRoot, distDirName, 'BUILD_ID');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').trim();
}

/** Platform app code SHA: HEAD if matches pin, else pin when only non-src commits on top. */
export function resolveApplicationCodeSha(cwd, pinFullSha) {
  const head = gitRevParse(cwd);
  if (head === pinFullSha) return head;
  const shortPin = pinFullSha.slice(0, 7);
  const diffSrc = execSync(`git diff ${pinFullSha}..HEAD -- src`, { cwd, encoding: 'utf8' }).trim();
  if (!diffSrc) return pinFullSha;
  throw new Error(
    `platform_src_drift: HEAD ${head.slice(0, 12)} is not ${shortPin} and src/ changed since pin`,
  );
}

export function collectRepoFacts(cwd, distDirName) {
  const dirty = gitDirty(cwd);
  return {
    gitHead: gitRevParse(cwd),
    gitBranch: gitBranch(cwd),
    gitDirty: dirty.dirty,
    gitDirtyFiles: dirty.files,
    nextBuildId: distDirName ? readNextBuildId(cwd, distDirName) : null,
  };
}

export function writeJson(filePath, data) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}

export function loadRunMeta(runDir) {
  const metaPath = path.join(runDir, 'meta.json');
  return JSON.parse(readFileSync(metaPath, 'utf8'));
}

/**
 * Verify stack meta matches pins and live BUILD_ID files; optional HTTP probe.
 * @returns {{ ok: true, meta, report }} or throws
 */
export async function probeRunStack({
  runDir,
  navRoot,
  platRoot,
  expectNavigatorSha,
  expectPlatformCodeSha,
}) {
  const meta = loadRunMeta(runDir);
  const runtime = meta.runtime;
  if (!runtime?.navigator?.gitHead || !runtime?.platform?.gitHead) {
    throw new Error('probe: meta.runtime missing — re-run r06-local-stack.mjs');
  }

  const navHead = runtime.navigator.gitHead;
  const platBuiltHead = runtime.platform.gitHead;
  const platCodeSha = runtime.platform.applicationCodeSha ?? platBuiltHead;

  const mismatches = [];
  if (expectNavigatorSha && navHead !== expectNavigatorSha) {
    mismatches.push(`navigator: meta ${navHead.slice(0, 12)} != expected ${expectNavigatorSha.slice(0, 12)}`);
  }
  if (expectPlatformCodeSha && platCodeSha !== expectPlatformCodeSha) {
    mismatches.push(
      `platform code: meta ${platCodeSha.slice(0, 12)} != expected ${expectPlatformCodeSha.slice(0, 12)}`,
    );
  }

  const navBuildDisk = readNextBuildId(navRoot, meta.navDist);
  const platBuildDisk = readNextBuildId(platRoot, meta.platDist);
  if (navBuildDisk && runtime.navigator.nextBuildId && navBuildDisk !== runtime.navigator.nextBuildId) {
    mismatches.push('navigator BUILD_ID on disk differs from meta (stale dist or meta)');
  }
  if (platBuildDisk && runtime.platform.nextBuildId && platBuildDisk !== runtime.platform.nextBuildId) {
    mismatches.push('platform BUILD_ID on disk differs from meta (stale dist or meta)');
  }

  const navPort = meta.navPort;
  const platPort = meta.platformPort;
  let navHealthStatus = null;
  let platLoginStatus = null;
  try {
    navHealthStatus = (await fetch(`http://127.0.0.1:${navPort}/api/health`, { redirect: 'manual' })).status;
  } catch (e) {
    mismatches.push(`navigator not reachable on ${navPort}: ${e.message}`);
  }
  try {
    platLoginStatus = (await fetch(`http://127.0.0.1:${platPort}/login`, { redirect: 'manual' })).status;
  } catch (e) {
    mismatches.push(`platform not reachable on ${platPort}: ${e.message}`);
  }
  if (navHealthStatus !== null && navHealthStatus >= 500) {
    mismatches.push(`navigator /api/health HTTP ${navHealthStatus}`);
  }
  if (platLoginStatus !== null && platLoginStatus >= 500) {
    mismatches.push(`platform /login HTTP ${platLoginStatus}`);
  }

  const runnerPlatHead = gitRevParse(platRoot);
  const report = {
    ok: mismatches.length === 0,
    runDir,
    ports: { nav: navPort, platform: platPort },
    runtime: {
      navigatorGitHead: navHead,
      platformBuiltGitHead: platBuiltHead,
      platformApplicationCodeSha: platCodeSha,
      navigatorBuildId: runtime.navigator.nextBuildId,
      platformBuildId: runtime.platform.nextBuildId,
    },
    runner: {
      platformGitHead: runnerPlatHead,
      docsOnlyDeltaFromCodeSha:
        runnerPlatHead !== platCodeSha
          ? execSync(`git diff ${platCodeSha}..${runnerPlatHead} --name-only`, {
              cwd: platRoot,
              encoding: 'utf8',
            })
              .trim()
              .split('\n')
              .filter(Boolean)
          : [],
    },
    http: { navHealthStatus, platLoginStatus },
    mismatches,
    probedAt: new Date().toISOString(),
  };

  writeJson(path.join(runDir, 'probe-report.json'), report);

  if (!report.ok) {
    const err = new Error(`r06_probe_failed: ${mismatches.join('; ')}`);
    err.report = report;
    throw err;
  }
  return { ok: true, meta, report };
}

export function countVitestPassed(stdout) {
  const m = stdout.match(/Tests\s+(\d+) passed/);
  return m ? Number(m[1]) : null;
}

export function runCmd(cmd, cwd, env) {
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd, env, encoding: 'utf8' });
  return {
    exitCode: res.status ?? 1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}
