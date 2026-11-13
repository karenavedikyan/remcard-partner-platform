import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";
import * as detailModule from "@/lib/clients-parity/fetch-observer-appeal-detail";
import { ObserverClientDetailHost } from "./ObserverClientDetailHost";
import { observerClientBackFrom } from "./observer-client-back";

describe("P3 ObserverClientDetailHost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires K2 GET on mount and passes public timeline when ready", async () => {
    const appeal = OBSERVER_FIXTURE_APPEALS[0]!;
    const partner = OBSERVER_FIXTURE_PARTNERS.find((p) => p.id === appeal.receivingPartnerId);
    const fetchSpy = vi.spyOn(detailModule, "fetchObserverReferredAppealDetail").mockResolvedValue({
      ok: true,
      appeal,
      partner: partner!,
      timeline: [{ at: "2026-01-01T00:00:00.000Z", text: "Публичное событие" }],
      purchase: { amountKopecks: 10000, note: null },
    });

    render(
      <ObserverClientDetailHost
        clientId={appeal.id}
        listAppeal={appeal}
        listPartner={partner}
        backFrom={observerClientBackFrom({}, "list")}
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(appeal.id, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    await waitFor(() => {
      expect(screen.getByText("Публичное событие")).toBeTruthy();
    });
  });

  it("retries on retryable server error", async () => {
    const appeal = OBSERVER_FIXTURE_APPEALS[0]!;
    const fetchSpy = vi
      .spyOn(detailModule, "fetchObserverReferredAppealDetail")
      .mockResolvedValueOnce({
        ok: false,
        code: "SERVER",
        message: "boom",
        retryable: true,
      })
      .mockResolvedValueOnce({
        ok: true,
        appeal,
        partner: OBSERVER_FIXTURE_PARTNERS[0]!,
        timeline: [],
        purchase: null,
      });

    const user = userEvent.setup();
    render(
      <ObserverClientDetailHost
        clientId={appeal.id}
        listAppeal={appeal}
        backFrom="flat-list"
        onBack={() => {}}
      />,
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: /Повторить/i }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });
});
