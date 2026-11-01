import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16d settings modal guards presentation", () => {
  const tsx = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotificationsClient.tsx"), "utf8");
  const css = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotifications.module.css"), "utf8");
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );

  it("NOTIFICATIONS-settings-guards: dirty confirm copy and host state wiring", () => {
    expect(tsx).toContain("onHostStateChange={handleSettingsHostState}");
    expect(tsx).toContain("SettingsDiscardConfirm");
    expect(tsx).toContain("Остаться");
    expect(tsx).toContain("Закрыть без сохранения");
    expect(tsx).toContain("requestSettingsClose");
    expect(tsx).toContain("finalizeSettingsDialogClosed");
    expect(tsx).toMatch(/settingsHost\.saving/);
    expect(css).toContain(".settingsDiscardBackdrop");
    expect(section).toContain("onHostStateChange");
    expect(section).toContain("savedPayloadRef");
  });
});
