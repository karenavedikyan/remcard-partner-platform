import { describe, expect, it } from "vitest";
import { adminNotificationActionHref, isTrustedAdminNotificationActionUrl } from "./admin-notification-url";

describe("admin-notification-url", () => {
  it("allows trusted partner and client admin routes only", () => {
    expect(isTrustedAdminNotificationActionUrl("https://prof.remcard.ru/admin/moderation/partners/p-1")).toBe(true);
    expect(isTrustedAdminNotificationActionUrl("https://remcard.ru/admin/users/u-1")).toBe(true);
    expect(isTrustedAdminNotificationActionUrl("/admin/moderation/partners/p-1")).toBe(true);
    expect(isTrustedAdminNotificationActionUrl("https://evil.example/admin/users/u-1")).toBe(false);
    expect(isTrustedAdminNotificationActionUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns null for untrusted action urls", () => {
    expect(adminNotificationActionHref("https://prof.remcard.ru/admin/moderation/partners/p1")).toBe(
      "https://prof.remcard.ru/admin/moderation/partners/p1",
    );
    expect(adminNotificationActionHref("https://evil.example/x")).toBeNull();
  });
});
