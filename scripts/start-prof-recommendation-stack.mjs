#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const NAV_PORT = "3021";
const PROF_PORT = "3020";
const NAV_ROOT = "/opt/cursor/worktrees/remcard-navigator-feat-prof-recommendation-readiness";
const PROF_ROOT = "/opt/cursor/worktrees/remcard-partner-platform-feat-prof-recommendation-readiness";

function killPort(port) {
  try {
    const pids = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function spawnDetached(cwd, env) {
  const port = env.PORT;
  const shellCmd = `set -a && [ -f .env.local ] && . ./.env.local; set +a; export PORT=${port} ${Object.entries(env)
    .filter(([k]) => k !== "PORT")
    .map(([k, v]) => `${k}=${JSON.stringify(String(v))}`)
    .join(" ")}; exec pnpm exec next dev -p ${port}`;
  const child = spawn("bash", ["-lc", shellCmd], {
    cwd,
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child.pid;
}

async function wait(url, ms = 180000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  mkdirSync("/tmp/prof-recommendation-stack", { recursive: true });
  killPort(NAV_PORT);
  killPort(PROF_PORT);
  spawnDetached(NAV_ROOT, {
    PORT: NAV_PORT,
    NEXT_PUBLIC_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
    APP_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
  });
  spawnDetached(PROF_ROOT, {
    PORT: PROF_PORT,
    REMCARD_API_BASE_URL: `http://127.0.0.1:${NAV_PORT}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PROF_PORT}`,
  });
  const navOk = await wait(`http://127.0.0.1:${NAV_PORT}/api/health`);
  const profOk = await wait(`http://127.0.0.1:${PROF_PORT}/login`);
  if (!navOk || !profOk) {
    console.error(JSON.stringify({ error: "stack_start_failed", navOk, profOk }));
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      navOrigin: `http://127.0.0.1:${NAV_PORT}`,
      profOrigin: `http://127.0.0.1:${PROF_PORT}`,
    }),
  );
}

main();
