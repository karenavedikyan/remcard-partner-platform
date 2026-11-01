import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16b inbox presentation", () => {
  const css = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotifications.module.css"), "utf8");

  it("NOTIFICATIONS-inbox-r1-block: panel toolbar rows pagination typography tokens", () => {
    expect(css).toContain(".inboxPanel");
    expect(css).toContain(".inboxToolbar");
    expect(css).toMatch(/\.inboxItem\[data-unread\][\s\S]*--admin-brand-soft/);
    expect(css).toContain(".inboxTitleRow");
    expect(css).toContain(".inboxTime");
    expect(css).toMatch(/\.pagination[\s\S]*border-top/);
    expect(css).toContain("--inbox-proto-text-xl");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("NOTIFICATIONS-inbox-copy: R1 page head strings live in client", () => {
    const tsx = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotificationsClient.tsx"), "utf8");
    expect(tsx).toContain("<h1>Уведомления</h1>");
    expect(tsx).toContain("События проекта в одном месте");
    expect(tsx).toContain("Прочитать всё");
    expect(tsx).not.toContain("Уведомления платформы");
  });
});
