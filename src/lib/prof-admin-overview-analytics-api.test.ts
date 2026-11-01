import { beforeEach, describe, expect, it, vi } from "vitest";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

import { fetchAdminAnalyticsOverview } from "./prof-admin-overview-analytics-api";

describe("prof-admin-overview-analytics-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests overview tab with encoded period via BFF path", async () => {
    remcardFetch.mockResolvedValueOnce({
      tab: "overview",
      period: "7d",
      registrationsByDay: [],
    });
    await fetchAdminAnalyticsOverview("7d");
    expect(remcardFetch).toHaveBeenCalledWith("/api/admin/analytics?tab=overview&period=7d", {
      signal: undefined,
    });
  });
});
