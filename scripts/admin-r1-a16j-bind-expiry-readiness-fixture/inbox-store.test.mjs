#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { createInboxStore } from "./inbox-store.mjs";

test("markOne reduces unread list on subsequent GET", () => {
  const store = createInboxStore();
  store.reset();
  assert.equal(store.unreadCount(), 3);
  store.markOne("n-unread-a");
  assert.equal(store.unreadCount(), 2);
  const unread = store.list({ unread: true, cursor: null, limit: 25 });
  assert.deepEqual(
    unread.items.map((i) => i.id),
    ["n-unread-b", "n-unread-page2"],
  );
});

test("markAll clears unread filter", () => {
  const store = createInboxStore();
  store.reset();
  store.markAll();
  assert.equal(store.unreadCount(), 0);
  assert.equal(store.list({ unread: true, cursor: null, limit: 25 }).items.length, 0);
});
