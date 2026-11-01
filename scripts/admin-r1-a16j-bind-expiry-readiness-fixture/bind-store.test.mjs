#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { createBindStore } from "./bind-store.mjs";

test("start replaces pending and completion links provider", () => {
  const store = createBindStore();
  const a = store.start("TELEGRAM");
  assert.match(a.startPayload, /^nbind_admin_/);
  assert.equal(store.getStatus().telegramLinked, false);
  const done = store.completeFromBot("TELEGRAM");
  assert.equal(done.ok, true);
  assert.equal(store.getStatus().telegramLinked, true);
});

test("expired pending rejects completion until new start", () => {
  const store = createBindStore();
  store.start("MAX");
  store.expirePending("MAX");
  assert.equal(store.completeFromBot("MAX").ok, false);
  store.start("MAX");
  assert.equal(store.completeFromBot("MAX").ok, true);
  assert.equal(store.getStatus().maxLinked, true);
});
