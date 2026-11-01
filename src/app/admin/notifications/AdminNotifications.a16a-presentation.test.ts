import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16a presentation", () => {
  it("NOTIFICATIONS-unread-row-surface: unread inbox rows use R1 brand-soft surface", () => {
    const css = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotifications.module.css"), "utf8");
    expect(css).toMatch(/\.inboxItem\[data-unread\][\s\S]*background:\s*var\(--admin-brand-soft/);
  });
});
