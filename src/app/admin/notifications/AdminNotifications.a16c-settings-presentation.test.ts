import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16c settings presentation", () => {
  const css = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotifications.module.css"), "utf8");
  const tsx = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotificationsClient.tsx"), "utf8");

  it("NOTIFICATIONS-settings-r1-block: dialog shell, backdrop, in-dialog section mapping", () => {
    expect(css).toContain(".settingsDialog");
    expect(css).toMatch(/\.settingsDialog::backdrop[\s\S]*backdrop-filter/);
    expect(css).toContain(".settingsDialogHead");
    expect(css).toContain(".settingsDialogBody");
    expect(css).toContain(".settingsInDialog");
    expect(css).toMatch(/width:\s*min\(580px/);
    expect(css).toMatch(/\.settingsInDialog #admin-notify-settings-title[\s\S]*clip:/);
  });

  it("NOTIFICATIONS-settings-copy: R1 dialog title and modal-only settings section", () => {
    expect(tsx).toContain("Уведомления администратора");
    expect(tsx).toContain('aria-haspopup="dialog"');
    expect(tsx).toContain("<AdminNotificationSettingsSection />");
    expect(tsx).not.toMatch(/<\/section>\s*<AdminNotificationSettingsSection/);
    expect(tsx).toContain("#admin-notify-settings-title");
    expect(tsx).toContain("settingsOpen");
  });
});
