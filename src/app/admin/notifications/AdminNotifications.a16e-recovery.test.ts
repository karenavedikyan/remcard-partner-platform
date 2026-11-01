import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16e save flight recovery", () => {
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );
  const client = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotificationsClient.tsx"), "utf8");

  it("NOTIFICATIONS-save-flight-recovery: flight cleared in save() finally, not in runSaveFlight", () => {
    expect(section).toContain("async function runSaveFlight");
    const runSaveBlock = section.slice(
      section.indexOf("async function runSaveFlight"),
      section.indexOf("async function save()"),
    );
    expect(runSaveBlock).not.toContain("saveFlightRef.current = null");
    expect(section).toMatch(/async function save\(\)[\s\S]*saveFlightRef\.current = null/);
  });

  it("NOTIFICATIONS-binding-busy-close: bind in-flight blocks modal close", () => {
    expect(client).toMatch(/settingsHost\.saving \|\| settingsHost\.bindingBusy/);
  });
});
