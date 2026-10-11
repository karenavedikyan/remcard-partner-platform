#!/usr/bin/env node
/**
 * Isolated PROF team-actions stack: navigator :3011 + platform :3010 (loopback, remcard_prof_test).
 */
import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NAV_PORT = Number(process.env.NAV_PORT || "3011");
const PROF_PORT = Number(process.env.PROF_PORT || "3010");
const NAV_ROOT = "/agent/repos/remcard-navigator";
const PROF_ROOT = "/agent/repos/remcard-partner-platform";
const PROF_ORIGIN = `http://127.0.0.1:${PROF_PORT}`;
const NAV_ORIGIN = `http://127.0.0.1:${NAV_PORT}`;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function pidsOnPort(port) {
  try {
    return sh(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function cmdline(pid) {
  try {
    return sh(`tr '\\0' ' ' < /proc/${pid}/cmdline`);
  } catch {
    return "";
  }
}

function killPort(port, repoHint) {
  for (const pid of pidsOnPort(port)) {
    const cmd = cmdline(pid);
    if (!cmd.includes("next") && !cmd.includes("node")) continue;
    if (repoHint && !cmd.includes(repoHint)) continue;
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

async function waitHttp(url, expect, ms = 120_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url);
      if (res.status === expect) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

function spawnDetached(cmd, args, cwd, env) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child.pid;
}

async function main() {
  mkdirSync("/tmp/prof-team-actions-stack", { recursive: true });
  const logNav = join("/tmp/prof-team-actions-stack", "navigator.log");
  const logProf = join("/tmp/prof-team-actions-stack", "platform.log");

  killPort(NAV_PORT, "remcard-navigator");
  killPort(PROF_PORT, "remcard-partner-platform");
  await new Promise((r) => setTimeout(r, 2000));

  const navPid = spawnDetached(
    "pnpm",
    ["exec", "next", "dev", "-p", String(NAV_PORT), "-H", "127.0.0.1"],
    NAV_ROOT,
    {},
  );
  writeFileSync(logNav, `started pid ${navPid}\n`);

  const navReady = await waitHttp(`${NAV_ORIGIN}/`, 401);
  if (!navReady) {
    throw new Error(`navigator not listening on ${NAV_ORIGIN} (see ${logNav})`);
  }

  const profPid = spawnDetached(
    "pnpm",
    ["exec", "next", "dev", "-p", String(PROF_PORT), "-H", "127.0.0.1"],
    PROF_ROOT,
    {
      REMCARD_API_BASE_URL: NAV_ORIGIN,
      NEXT_PUBLIC_APP_URL: PROF_ORIGIN,
    },
  );
  writeFileSync(logProf, `started pid ${profPid}\n`);

  const profReady = await waitHttp(`${PROF_ORIGIN}/`, 200);
  if (!profReady) {
    throw new Error(`platform not listening on ${PROF_ORIGIN} (see ${logProf})`);
  }

  console.log(
    JSON.stringify({
      navOrigin: NAV_ORIGIN,
      profOrigin: PROF_ORIGIN,
      navPid,
      profPid,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
