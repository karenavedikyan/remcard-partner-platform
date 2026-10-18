import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { describe, it } from "node:test";
import {
  assertNoForeignPortKillShell,
  findFreeLoopbackPort,
  foreignPortKillInvokedRecently,
  isLoopbackPortOpen,
  resetForeignPortKillMarker,
  resolveLoopbackListenPort,
  stopOwnedServer,
} from "./login-entry-process-lifecycle.mjs";

describe("login-entry process lifecycle", () => {
  it("does not treat foreign port kill shell patterns as safe", () => {
    resetForeignPortKillMarker();
    assert.equal(assertNoForeignPortKillShell("lsof -ti :3040 | xargs kill -9"), false);
    assert.equal(assertNoForeignPortKillShell("fuser -k 3040/tcp"), false);
    assert.equal(assertNoForeignPortKillShell("node --test harness.test.mjs"), true);
  });

  it("leaves a foreign listener alive when canonical port is busy", async () => {
    resetForeignPortKillMarker();
    const sentinel = net.createServer();
    await new Promise((resolve, reject) => {
      sentinel.once("error", reject);
      sentinel.listen(0, "127.0.0.1", resolve);
    });
    const port = sentinel.address().port;
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(await isLoopbackPortOpen(port), true);
    const resolved = await resolveLoopbackListenPort({ preferredPort: port, requireExactPort: true });
    assert.equal(resolved.ok, false);
    assert.equal(await isLoopbackPortOpen(port), true);
    await new Promise((resolve) => sentinel.close(resolve));
    assert.equal(foreignPortKillInvokedRecently(), false);
  });

  it("finds a substitute free loopback port when substitution allowed", async () => {
    resetForeignPortKillMarker();
    const sentinel = net.createServer();
    await new Promise((resolve, reject) => {
      sentinel.once("error", reject);
      sentinel.listen(0, "127.0.0.1", resolve);
    });
    const port = sentinel.address().port;
    const free = await findFreeLoopbackPort(port, { maxScan: 8 });
    assert.notEqual(free, port);
    assert.ok(free > port);
    await new Promise((resolve) => sentinel.close(resolve));
  });

  it("stops only the owned child process handle", async () => {
    resetForeignPortKillMarker();
    const child = spawn("sleep", ["60"], { detached: true, stdio: "ignore" });
    const handle = { child, pid: child.pid, port: null };
    assert.ok(handle.pid);
    const stopped = await stopOwnedServer(handle, 5_000);
    assert.equal(stopped.stopped, true);
    assert.equal(foreignPortKillInvokedRecently(), false);
  });
});
