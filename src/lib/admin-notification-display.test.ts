import { describe, expect, it } from "vitest";
import { adminNotificationCategoryLabel } from "./admin-notification-display";

describe("adminNotificationCategoryLabel", () => {
  it("maps SYSTEM events by meta.kind for admin registration/activity", () => {
    expect(
      adminNotificationCategoryLabel({
        type: "SYSTEM",
        meta: { scope: "ADMIN", kind: "admin.new_client" },
      }),
    ).toBe("Новый клиент");
    expect(
      adminNotificationCategoryLabel({
        type: "SYSTEM",
        title: "Проверочная регистрация",
        meta: { scope: "ADMIN", kind: "admin.new_client" },
      } as never),
    ).toBe("Новый клиент");
  });

  it("falls back to legacy type labels", () => {
    expect(adminNotificationCategoryLabel({ type: "NEW_PARTNER", meta: null })).toBe("Новый партнёр");
  });
});
