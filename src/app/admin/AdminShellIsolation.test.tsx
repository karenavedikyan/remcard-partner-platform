import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin shell isolation", () => {
  it("does not mount partner notification inbox hook in admin layout or account controls", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");
    const controls = readFileSync(join(process.cwd(), "src/app/admin/AdminAccountControls.tsx"), "utf8");
    const header = readFileSync(join(process.cwd(), "src/app/admin/AdminHeader.tsx"), "utf8");
    expect(layout).not.toContain("useProfNotifications");
    expect(layout).not.toContain("ProfNotificationBell");
    expect(controls).not.toContain("useProfNotifications");
    expect(controls).not.toContain("ProfNotificationBell");
    expect(controls).toContain("AdminNotificationBell");
    expect(header).toContain("/admin/notifications");
  });
});
