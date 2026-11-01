import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "AdminNotifications.module.css"), "utf8");
const client = readFileSync(path.join(__dirname, "AdminNotificationsClient.tsx"), "utf8");

describe("settings dialog mobile presentation", () => {
  it("keeps the close control compact without losing its accessible label", () => {
    expect(css).toMatch(/\.settingsDialogClose\s*\{[^}]*flex-shrink:\s*0/s);
    expect(css).toMatch(/\.settingsSaveButton[\s\S]*accent-fill/);
    expect(client).toContain('aria-label="Закрыть окно настроек"');
    expect(client).toContain('<span aria-hidden="true">×</span>');
  });

  it("targets the literal heading id rather than a CSS-module-local id", () => {
    expect(css).toContain(".settingsInDialog :global(#admin-notify-settings-title)");
    expect(css).not.toMatch(/\.settingsInDialog\s+#admin-notify-settings-title\s*\{/);
  });

  it("does not override the primary save action with a white surface background", () => {
    expect(css).toMatch(
      /\.settingsInDialog \.settingsSection > button\.settingsSaveButton\s*\{[^}]*background:\s*var\(--accent-fill(?:,|\))/s,
    );
  });
});
