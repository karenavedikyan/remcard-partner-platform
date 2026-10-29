import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin shell isolation", () => {
  it("does not mount partner notification inbox hook in admin layout or account controls", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");
    const controls = readFileSync(join(process.cwd(), "src/app/admin/AdminAccountControls.tsx"), "utf8");
    const nav = readFileSync(join(process.cwd(), "src/app/admin/AdminNav.tsx"), "utf8");
    expect(layout).not.toContain("useProfNotifications");
    expect(layout).not.toContain("ProfNotificationBell");
    expect(controls).not.toContain("useProfNotifications");
    expect(controls).not.toContain("ProfNotificationBell");
    expect(controls).toContain("AdminNotificationBell");
    expect(nav).toContain("/admin/notifications");
  });

  it("keeps a single account slot that shares the mobile header row with nav", () => {
    const header = readFileSync(join(process.cwd(), "src/app/admin/AdminHeader.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/app/admin/Admin.module.css"), "utf8");
    expect(header.match(/<AdminAccountControls\b/g)?.length).toBe(1);
    expect(header).toContain("styles.accountSlot");
    expect(css).toContain(".accountSlot");
    expect(css).toMatch(/\.navMobileBar[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.navMobileCurrent[\s\S]*text-overflow:\s*ellipsis/);
  });
});
