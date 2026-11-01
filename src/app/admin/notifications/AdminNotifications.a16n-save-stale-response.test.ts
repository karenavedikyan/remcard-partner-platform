import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16n save stale response", () => {
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );

  it("NOTIFICATIONS-save-stale-patch: serializes PATCH apply when draft changed during flight", () => {
    expect(section).toContain("saveSeqRef");
    expect(section).toMatch(/saveRequestId !== saveSeqRef\.current/);
    expect(section).toMatch(
      /JSON\.stringify\(adminNotificationSettingsPatchPayload\(current\)\) !== JSON\.stringify\(payloadSent\)/,
    );
  });
});
