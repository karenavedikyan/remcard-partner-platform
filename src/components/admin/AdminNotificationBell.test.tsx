import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  fetchAdminUnreadNotificationCount: vi.fn(),
}));
vi.mock("@/lib/prof-admin-notifications-api", () => api);

import { AdminNotificationBell } from "./AdminNotificationBell";

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAdminUnreadNotificationCount.mockResolvedValue(3);
});

describe("AdminNotificationBell", () => {
  it("shows unread badge and links to admin inbox", async () => {
    render(<AdminNotificationBell enabled />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /непрочитано: 3/i })).toHaveAttribute(
        "href",
        "/admin/notifications",
      ),
    );
  });

  it("does not fetch when disabled for non-admin identity", () => {
    render(<AdminNotificationBell enabled={false} />);
    expect(api.fetchAdminUnreadNotificationCount).not.toHaveBeenCalled();
  });
});
