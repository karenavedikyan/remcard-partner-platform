import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16i channel binding harness", () => {
  const upstream = readFileSync(
    join(process.cwd(), "scripts/admin-r1-a16i-channel-binding-fixture/upstream.mjs"),
    "utf8",
  );
  const capture = readFileSync(
    join(process.cwd(), "scripts/admin-r1-a16i-channel-binding-fixture/capture-native.mjs"),
    "utf8",
  );
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );

  it("NOTIFICATIONS-bind-lifecycle: upstream models pending start and bot completion", () => {
    expect(upstream).toContain("createBindStore");
    expect(upstream).toContain("completeBindTelegram");
    expect(upstream).toContain("expireBindTelegram");
    expect(upstream).toMatch(/bind_start.*startPayloadPrefix/s);
  });

  it("NOTIFICATIONS-bind-lifecycle: native capture records binding[] lifecycle metrics", () => {
    expect(capture).toContain("bindingLifecycleDefs");
    expect(capture).toContain("telegram-unlinked-to-save-reload");
    expect(capture).toContain("bindLogCounts");
  });

  it("NOTIFICATIONS-bind-lifecycle: UI serializes bind start flight", () => {
    expect(section).toContain("bindFlightRef");
  });
});
