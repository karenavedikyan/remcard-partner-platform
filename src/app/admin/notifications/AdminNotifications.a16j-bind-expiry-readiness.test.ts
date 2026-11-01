import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16j bind expiry readiness", () => {
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );
  const css = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotifications.module.css"), "utf8");
  const api = readFileSync(join(process.cwd(), "src/lib/prof-admin-notifications-api.ts"), "utf8");
  const capture = readFileSync(
    join(process.cwd(), "scripts/admin-r1-a16j-bind-expiry-readiness-fixture/capture-native.mjs"),
    "utf8",
  );

  it("NOTIFICATIONS-bind-expiry: API type includes expiresAt from bind-start contract", () => {
    expect(api).toMatch(/expiresAt:\s*string/);
  });

  it("NOTIFICATIONS-bind-expiry: UI shows client-side expiry without GET pending", () => {
    expect(section).toContain("admin-notify-bind-expiry");
    expect(section).toContain("formatBindExpiryMsk");
    expect(section).toContain("setBindChallenge");
    expect(section).not.toMatch(/fetchAdminNotificationBindStatus[\s\S]*pending/i);
  });

  it("NOTIFICATIONS-settings-save: dialog save uses accent-fill surface", () => {
    expect(css).toMatch(/\.settingsSaveButton[\s\S]*accent-fill/);
    expect(section).toContain("settingsSaveButton");
  });

  it("NOTIFICATIONS-readiness: native harness covers expiry display and draft backdrop stay", () => {
    expect(capture).toContain("readinessScenarioDefs");
    expect(capture).toContain("bind-expiry-display-and-restart");
    expect(capture).toContain("save-close-reopen-draft-backdrop-stay");
    expect(capture).toContain("settings-get-echoes-patch");
  });
});
