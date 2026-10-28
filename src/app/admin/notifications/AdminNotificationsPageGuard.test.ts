import { describe, expect, it, vi } from "vitest";

vi.mock("./AdminNotificationsClient", () => ({
  AdminNotificationsClient: () => null,
}));

const guard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prof-admin-session", () => ({
  requireProfPlatformAdmin: guard,
}));

describe("Admin notifications page guard", () => {
  it("requires platform ADMIN/OWNER session before rendering", async () => {
    const { default: Page } = await import("./page");
    await Page();
    expect(guard).toHaveBeenCalledWith("/admin/notifications");
  });
});
