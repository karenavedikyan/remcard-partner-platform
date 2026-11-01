import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16m refresh error draft", () => {
  const section = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationSettingsSection.tsx"),
    "utf8",
  );

  it("NOTIFICATIONS-refresh-error-draft: catch preserves draft baseline when reload GET fails", () => {
    expect(section).toMatch(/if \(isDraftActive\(\)\) \{\s*setLoadError\(message\);\s*return;/);
    expect(section).not.toMatch(
      /catch \(caught\)[\s\S]*setForm\(null\)[\s\S]*if \(isDraftActive/,
    );
  });

  it("NOTIFICATIONS-refresh-error-draft: initial fatal load still uses full-screen retry", () => {
    expect(section).toMatch(/if \(!form\) \{/);
    expect(section).toMatch(/if \(loading && !form\)/);
  });
});
