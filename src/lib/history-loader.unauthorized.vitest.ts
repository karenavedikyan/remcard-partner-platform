import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "./api-client";

vi.mock("./api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

vi.mock("./settlements-loader", () => ({
  fetchSettlements: vi.fn(),
}));

import { remcardFetch } from "./api-client";
import { fetchSettlements } from "./settlements-loader";
import { fetchAccrualSourcesSnapshot } from "./history-loader";

describe("fetchAccrualSourcesSnapshot unauthorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rethrows wallet 401 instead of falling back to settlements", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (
        path.includes("/api/pro/wallet/balance") ||
        path.includes("/api/pro/wallet/transactions")
      ) {
        throw new RemcardApiError(401, "Unauthorized");
      }
      throw new Error(`unexpected ${path}`);
    });

    await expect(fetchAccrualSourcesSnapshot()).rejects.toMatchObject({ status: 401 });
    expect(fetchSettlements).not.toHaveBeenCalled();
  });

  it("rethrows settlements 401 after wallet unavailable", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (
        path.includes("/api/pro/wallet/balance") ||
        path.includes("/api/pro/wallet/transactions")
      ) {
        throw new RemcardApiError(403, "Forbidden");
      }
      throw new Error(`unexpected ${path}`);
    });
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(401, "Unauthorized"));

    await expect(fetchAccrualSourcesSnapshot()).rejects.toMatchObject({ status: 401 });
  });
});
