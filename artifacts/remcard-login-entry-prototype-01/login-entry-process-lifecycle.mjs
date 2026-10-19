/**
 * Safe loopback port + owned child lifecycle (no killing foreign listeners).
 */
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";

const LOOPBACK = "127.0.0.1";

export function isLoopbackPortOpen(port, host = LOOPBACK, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: timeoutMs }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** @returns {Promise<number | null>} */
export async function findFreeLoopbackPort(startPort, { maxScan = 32 } = {}) {
  const base = Number(startPort);
  if (!Number.isInteger(base) || base <= 0 || base > 65535) return null;
  for (let i = 0; i < maxScan; i += 1) {
    const candidate = base + i;
    if (candidate > 65535) break;
    // eslint-disable-next-line no-await-in-loop
    if (!(await isLoopbackPortOpen(candidate))) return candidate;
  }
  return null;
}

export function parseLoopbackPortFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (!["127.0.0.1", "localhost", "::1"].includes(u.hostname)) return null;
    return u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

/**
 * @param {{ preferredPort: number, requireExactPort?: boolean, maxScan?: number }} opts
 */
export async function resolveLoopbackListenPort(opts) {
  const { preferredPort, requireExactPort = false, maxScan = 32 } = opts;
  const busy = await isLoopbackPortOpen(preferredPort);
  if (!busy) return { ok: true, port: preferredPort, substituted: false };
  if (requireExactPort) {
    return {
      ok: false,
      reason: `loopback port ${preferredPort} already in use (foreign listener left intact)`,
      port: preferredPort,
    };
  }
  const free = await findFreeLoopbackPort(preferredPort + 1, { maxScan });
  if (free == null) {
    return { ok: false, reason: `no free loopback port in ${preferredPort + 1}..${preferredPort + maxScan}` };
  }
  return { ok: true, port: free, substituted: true, preferredPort };
}

export function spawnOwnedNextStart({ port, cwd, env }) {
  const distDir = env?.LOGIN_ENTRY_NEXT_DIST_DIR;
  const distPrefix = distDir
    ? `LOGIN_ENTRY_NEXT_DIST_DIR=${JSON.stringify(String(distDir))} `
    : "";
  const child = spawn(
    "bash",
    ["-lc", `env -u R06_NEXT_DIST_DIR ${distPrefix}npx next start -p ${port} -H ${LOOPBACK}`],
    {
      cwd,
      env: { ...env, NODE_ENV: "production", PORT: String(port) },
      stdio: "ignore",
      detached: true,
    },
  );
  return { child, pid: child.pid ?? null, port };
}

export function waitForChildExit(child, timeoutMs = 10_000) {
  if (!child || child.exitCode != null || child.signalCode != null) {
    return Promise.resolve(child?.exitCode ?? 0);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

/** Terminate only the owned detached process group. */
export async function stopOwnedServer(handle, timeoutMs = 8_000) {
  if (!handle?.child?.pid) return { stopped: false, reason: "no handle" };
  const { child } = handle;
  let termSent = false;
  try {
    process.kill(-child.pid, "SIGTERM");
    termSent = true;
  } catch {
    try {
      child.kill("SIGTERM");
      termSent = true;
    } catch {
      /* already gone */
    }
  }
  const exitCode = await waitForChildExit(child, timeoutMs);
  if (exitCode == null && termSent) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
    await waitForChildExit(child, 2_000);
  }
  return { stopped: true, exitCode };
}

/** Test hook: ensure we never shell out to lsof/fuser kill patterns. */
export function foreignPortKillInvokedRecently() {
  return Boolean(globalThis.__loginEntryForeignPortKill);
}

export function resetForeignPortKillMarker() {
  globalThis.__loginEntryForeignPortKill = false;
}

export function markForeignPortKillInvoked() {
  globalThis.__loginEntryForeignPortKill = true;
}

/** @deprecated guard — releasePort must not exist in runner; tests assert no shell kill. */
export function assertNoForeignPortKillShell(command) {
  const c = String(command);
  if (/lsof.*kill|fuser\s+-k|kill\s+-9.*:\d+/i.test(c)) {
    markForeignPortKillInvoked();
    return false;
  }
  return true;
}

export function spawnSyncSafe(command, args, options) {
  const cmd = [command, ...(args ?? [])].join(" ");
  assertNoForeignPortKillShell(cmd);
  return spawnSync(command, args, options);
}
