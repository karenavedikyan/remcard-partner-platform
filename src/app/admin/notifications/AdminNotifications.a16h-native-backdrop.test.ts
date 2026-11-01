import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16h native backdrop pointer", () => {
  const client = readFileSync(join(process.cwd(), "src/app/admin/notifications/AdminNotificationsClient.tsx"), "utf8");
  const capture = readFileSync(
    join(process.cwd(), "scripts/admin-r1-a16h-native-backdrop-fixture/capture-native.mjs"),
    "utf8",
  );

  it("NOTIFICATIONS-dialog-backdrop-pointer: dialog surface click routes to requestSettingsClose", () => {
    expect(client).toContain("handleSettingsDialogBackdropClick");
    expect(client).toMatch(/if \(event\.target !== event\.currentTarget\) return/);
    expect(client).toContain("onClick={handleSettingsDialogBackdropClick}");
  });

  it("NOTIFICATIONS-dialog-backdrop-pointer: native harness forbids synthetic cancel fallback in PASS", () => {
    expect(capture).toContain("pointerOutsideDialogPanel");
    expect(capture).not.toMatch(/dispatchEvent\(new Event\("cancel"/);
  });
});
