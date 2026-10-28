import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "src/app/admin/notifications/AdminNotifications.module.css",
  "src/components/admin/AdminNotificationBell.module.css",
];

describe("Admin notification CSS theme tokens", () => {
  it("avoids undefined accent/onaccent/onprimary tokens in new admin notification styles", () => {
    for (const rel of files) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      expect(source).not.toMatch(/var\(--accent\)/);
      expect(source).not.toMatch(/var\(--onaccent\)/);
      expect(source).not.toMatch(/var\(--onprimary\)/);
    }
    const bell = readFileSync(join(process.cwd(), files[1]!), "utf8");
    expect(bell).toContain("var(--primary-fg)");
    expect(bell).toContain("outline: 3px solid var(--primary)");
  });
});
