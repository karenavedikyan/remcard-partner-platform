import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const storeSrc = readFileSync(
  join(process.cwd(), "scripts/admin-r1-a16f-inbox-fixture/inbox-store.mjs"),
  "utf8",
);
const upstreamSrc = readFileSync(
  join(process.cwd(), "scripts/admin-r1-a16f-inbox-fixture/upstream.mjs"),
  "utf8",
);

describe("A16f stateful inbox synthetic store", () => {
  it("NOTIFICATIONS-inbox-state-mark-one: store mutates readAt on markOne", () => {
    expect(storeSrc).toMatch(/function markOne\(id\)[\s\S]*row\.readAt = NOW/);
    expect(storeSrc).toContain('if (unread) {\n      pool = pool.filter((i) => !i.readAt);');
  });

  it("NOTIFICATIONS-inbox-state-mark-all: markAll sets readAt on every unread row", () => {
    expect(storeSrc).toMatch(/function markAll\(\)[\s\S]*if \(!row\.readAt\) row\.readAt = NOW/);
    expect(storeSrc).toContain("function unreadCount()");
  });

  it("NOTIFICATIONS-inbox-state-pagination: paginate-unread uses cursor page2 without overlap", () => {
    expect(storeSrc).toContain('flags.scenario === "paginate-unread"');
    expect(storeSrc).toContain('nextCursor: page1.length > 0 ? "page2" : null');
    expect(storeSrc).toContain('i.id !== "n-unread-page2"');
  });

  it("NOTIFICATIONS-inbox-state-list-failure: upstream can fail list once without mutating marks", () => {
    expect(upstreamSrc).toContain("consumeListFailure");
    expect(upstreamSrc).toContain("shouldFailMarkOne");
    expect(upstreamSrc).toMatch(/inbox\.markOne\(id\)/);
    expect(upstreamSrc).not.toMatch(/kind: "mark_one"[\s\S]*return json\(res, 200, \{ ok: true \}\);[\s\S]*\/\/ no state/);
  });
});

describe("AdminNotifications A16f fixture ownership", () => {
  it("NOTIFICATIONS-a16f-harness: scripts live under admin-r1-a16f-inbox-fixture only", () => {
    expect(upstreamSrc).toContain("./inbox-store.mjs");
    expect(upstreamSrc).toContain("unreadCount: inbox.unreadCount()");
  });
});
