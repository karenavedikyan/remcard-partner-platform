import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObserverPartnersWorkspace } from "./ObserverPartnersWorkspace";

vi.mock("@/lib/clients-parity/fetch-observer-appeals", () => ({
  fetchObserverReferredAppeals: vi.fn(),
}));

import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";

const fetchMock = vi.mocked(fetchObserverReferredAppeals);

describe("P3 ObserverPartnersWorkspace load", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows contract blocked UI from adapter", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      code: "BLOCKED_CONTRACT",
      message: "Нет маршрута",
      retryable: false,
      blockerId: "BLK-OBSERVER-REFERRED",
      missingRoutes: ["GET /api/pro/referred-appeals"],
    });
    render(<ObserverPartnersWorkspace />);
    expect(await screen.findByTestId("clients-parity-contract-blocked")).toBeTruthy();
  });

  it("retries after retryable load error", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        code: "NETWORK",
        message: "Сеть",
        retryable: true,
      })
      .mockResolvedValueOnce({
        ok: true,
        appeals: [],
        partners: [],
        personalMeta: {},
        overlayVersions: {},
        pageInfo: { total: 0, loaded: 0, hasMore: false },
      });
    render(<ObserverPartnersWorkspace />);
    const retry = await screen.findByTestId("ca-observer-load-error");
    expect(retry).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Повторить/i }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
