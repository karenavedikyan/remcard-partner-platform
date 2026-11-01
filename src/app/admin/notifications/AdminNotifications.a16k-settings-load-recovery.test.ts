import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16k settings load recovery", () => {
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );
  const capture = readFileSync(
    join(process.cwd(), "scripts/admin-r1-a16k-settings-load-recovery-fixture/capture-native.mjs"),
    "utf8",
  );
  const upstream = readFileSync(
    join(process.cwd(), "scripts/admin-r1-a16k-settings-load-recovery-fixture/upstream.mjs"),
    "utf8",
  );

  it("NOTIFICATIONS-settings-load-recovery: serializes loads and preserves dirty draft on late GET", () => {
    expect(section).toContain("loadSeqRef");
    expect(section).toMatch(/isDraftActive|draftActive/);
    expect(section).toMatch(/if \(isDraftActive\(\)\)[\s\S]*setBindings\(data\.bindings\)/);
  });

  it("NOTIFICATIONS-settings-load-recovery: blocks save until baseline exists", () => {
    expect(section).toContain("savedPayloadRef.current === null");
    expect(section).toMatch(/if \(!form \|\| loading\) return/);
  });

  it("NOTIFICATIONS-settings-load-recovery: native harness covers delayed GET and 500 retry", () => {
    expect(capture).toContain("loadRecoveryScenarioDefs");
    expect(capture).toContain("settings-delayed-get-persisted");
    expect(capture).toContain("settings-get-500-retry");
    expect(upstream).toContain("settingsGetDelayMs");
    expect(upstream).toContain("settingsGetFailOnce");
  });
});
