import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchProfUnreadCount,
  markAllProfNotificationsRead,
} from "./prof-notifications";

vi.mock("./api-client", () => ({
  remcardFetch: vi.fn(),
}));

import { remcardFetch } from "./api-client";

describe("prof-notifications client", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("fetchProfUnreadCount returns numeric count", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ count: 3 });
    await expect(fetchProfUnreadCount()).resolves.toBe(3);
  });

  it("markAllProfNotificationsRead sends snapshotBefore", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ updated: 2 });
    await markAllProfNotificationsRead("2026-10-08T12:00:00.000Z");
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/notifications", {
      method: "PATCH",
      body: { all: true, snapshotBefore: "2026-10-08T12:00:00.000Z" },
    });
  });
});
