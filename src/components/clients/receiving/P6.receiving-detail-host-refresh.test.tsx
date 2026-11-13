import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

function wireFixture(revision: number, privateNotes: string | null, stageKey = "ws_new") {
  return {
    ok: true as const,
    wire: {
      appeal: {
        id: "ap_cas",
        clientDisplayName: "Клиент",
        stageKey,
        stageId: stageKey,
        privateNotes,
        purchaseOrderId: null,
        certificateId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      revision,
      history:
        revision > 1
          ? [
              {
                at: "2026-01-02T00:00:00Z",
                authorLabel: "ops",
                text: "stage moved",
              },
            ]
          : [],
      workingStages: [{ id: "ws_new", label: "Новый" }, { id: "ws_measure", label: "Замер" }],
      refusalReasons: [],
    },
  };
}

describe("P6.receiving-detail-host refresh after mutation", () => {
  const fetchDetail = vi.spyOn(api, "fetchReceivingAppealDetailWire");
  const patchProfile = vi.spyOn(api, "patchReceivingAppealProfileCas");
  const patchStage = vi.spyOn(api, "patchReceivingAppealStageCas");
  const onAppealMutated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchDetail.mockReset();
    patchProfile.mockReset();
    patchStage.mockReset();
    onAppealMutated.mockResolvedValue(undefined);
  });

  it("consecutive note saves use refreshed revision (r1 then r2)", async () => {
    fetchDetail
      .mockResolvedValueOnce(wireFixture(1, "A"))
      .mockResolvedValueOnce(wireFixture(2, "B"))
      .mockResolvedValueOnce(wireFixture(2, "B"));
    patchProfile
      .mockResolvedValueOnce({ ok: true as const })
      .mockResolvedValueOnce({ ok: true as const });

    const user = userEvent.setup();
    render(
      <ReceivingAppealDetailHost
        appealId="ap_cas"
        onBack={() => undefined}
        onAppealMutated={onAppealMutated}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-save")).toBeTruthy());
    const input = screen.getByTestId("ca-receiving-notes-input");
    await user.clear(input);
    await user.type(input, "B");
    await user.click(screen.getByTestId("ca-receiving-notes-save"));

    await waitFor(() => expect(patchProfile).toHaveBeenCalledTimes(1));
    expect(patchProfile.mock.calls[0][1].expectedRevision).toBe(1);

    await waitFor(() => expect(fetchDetail.mock.calls.length).toBeGreaterThanOrEqual(2));

    await user.clear(input);
    await user.type(input, "B2");
    await user.click(screen.getByTestId("ca-receiving-notes-save"));

    await waitFor(() => expect(patchProfile).toHaveBeenCalledTimes(2));
    expect(patchProfile.mock.calls[1][1].expectedRevision).toBe(2);
    expect(onAppealMutated).toHaveBeenCalledTimes(2);
  });

  it("stage success triggers detail re-fetch with history", async () => {
    fetchDetail
      .mockResolvedValueOnce(wireFixture(1, null))
      .mockResolvedValueOnce(wireFixture(2, null, "ws_measure"));
    patchStage.mockResolvedValueOnce({ ok: true as const });

    const user = userEvent.setup();
    render(<ReceivingAppealDetailHost appealId="ap_cas" onBack={() => undefined} />);

    await waitFor(() => expect(screen.getByTestId("ca-receiving-detail-stage")).toBeTruthy());
    const select = screen.getByTestId("ca-receiving-stage-select");
    await user.selectOptions(select, "ws_measure");
    await user.click(screen.getByTestId("ca-receiving-stage-apply"));

    await waitFor(() => expect(patchStage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDetail).toHaveBeenCalledTimes(2));
  });

  it("committed PATCH ok when post-save refresh fails (notice, not save error)", async () => {
    fetchDetail
      .mockResolvedValueOnce(wireFixture(1, "A"))
      .mockResolvedValueOnce({ ok: false as const, code: "ERROR" as const, message: "net" });
    patchProfile.mockResolvedValueOnce({ ok: true as const });

    const user = userEvent.setup();
    render(<ReceivingAppealDetailHost appealId="ap_cas" onBack={() => undefined} />);

    await waitFor(() => expect(screen.getByTestId("ca-receiving-notes-save")).toBeTruthy());
    const input = screen.getByTestId("ca-receiving-notes-input");
    await user.clear(input);
    await user.type(input, "B");
    await user.click(screen.getByTestId("ca-receiving-notes-save"));

    await waitFor(() =>
      expect(screen.getByTestId("ca-receiving-detail-refresh-notice")).toBeTruthy(),
    );
    expect(screen.queryByRole("alert", { name: /ошибка/i })).toBeNull();
  });

  it("stale in-flight GET does not overwrite after appealId changes", async () => {
    let resolveSlow: (v: ReturnType<typeof wireFixture>) => void = () => undefined;
    const slow = new Promise<ReturnType<typeof wireFixture>>((r) => {
      resolveSlow = r;
    });

    fetchDetail
      .mockImplementationOnce(() => slow as ReturnType<typeof fetchDetail.mock>)
      .mockResolvedValueOnce(wireFixture(1, null, "ws_new"));

    const { rerender } = render(
      <ReceivingAppealDetailHost appealId="ap_old" onBack={() => undefined} />,
    );

    rerender(<ReceivingAppealDetailHost appealId="ap_new" onBack={() => undefined} />);

    await waitFor(() => expect(fetchDetail).toHaveBeenCalledWith("ap_new"));
    resolveSlow(wireFixture(9, "stale", "ws_measure"));

    await waitFor(() => expect(screen.queryByText(/stale/i)).toBeNull());
  });
});
