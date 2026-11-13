import { describe, expect, it, vi } from "vitest";
import { RECEIVING_SYSTEM_STAGE } from "@/lib/clients-parity/receiving-appeals-api";
import {
  RECEIVING_BULK_EXPECTED_REVISION_CONFLICT,
  RECEIVING_BULK_STAGE_OK_NOTE_REFRESH_FAILED,
  applyOneReceivingBulkIntent,
  mergeServiceNote,
  receivingBulkApplyNeedsListReload,
  receivingBulkExpectedRevisionConflictsWithSnapshot,
  receivingBulkNoteSnapshotFromWire,
  receivingBulkProfileNotePatchFromSnapshot,
  type ReceivingBulkApplyTransportDeps,
  type ReceivingBulkIntentOutcome,
} from "@/lib/clients-parity/receiving-bulk-apply";
import type { ReceivingAppealPatchIntent } from "./receiving-bulk-handoff";

const baseRow = {
  id: "ap_1",
  clientName: "c",
  certificateId: "",
  receivingPartnerUserId: "u",
  receivingPartnerId: "u",
  referrerPartnerId: "r",
  interest: "",
  stageId: "ws_new",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function minimalWire(revision: number, privateNotes: string | null) {
  return {
    appeal: {
      id: "ap_1",
      clientDisplayName: "c",
      stageId: "ws_new",
      privateNotes,
    },
    revision,
    history: [],
  };
}

describe("P6.receiving-bulk-apply snapshot CAS", () => {
  it("rejects P5 expectedRevision when it differs from initial GET (no writes)", async () => {
    const stageSpy = vi.fn();
    const profileSpy = vi.fn();
    const deps: ReceivingBulkApplyTransportDeps = {
      fetchDetail: vi.fn().mockResolvedValue({ ok: true, wire: minimalWire(2, "A") }),
      patchStage: stageSpy,
      patchProfile: profileSpy,
    };
    const out = await applyOneReceivingBulkIntent(
      {
        appealId: "ap_1",
        body: { expectedRevision: 1, serviceNote: "n", serviceNoteAppend: true },
      },
      baseRow,
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.message).toBe(RECEIVING_BULK_EXPECTED_REVISION_CONFLICT);
    expect(stageSpy).not.toHaveBeenCalled();
    expect(profileSpy).not.toHaveBeenCalled();
  });

  it("pure expectedRevision guard matches snapshot only", () => {
    const snap = receivingBulkNoteSnapshotFromWire(minimalWire(2, "A"));
    expect(receivingBulkExpectedRevisionConflictsWithSnapshot({ expectedRevision: 1 }, snap)).toBe(
      true,
    );
    expect(receivingBulkExpectedRevisionConflictsWithSnapshot({}, snap)).toBe(false);
    expect(receivingBulkExpectedRevisionConflictsWithSnapshot({ expectedRevision: 2 }, snap)).toBe(
      false,
    );
  });

  it("list reload when stage applied but note step failed", () => {
    const outcomes: ReceivingBulkIntentOutcome[] = [
      {
        appealId: "ap_1",
        ok: false,
        stageApplied: true,
        message: RECEIVING_BULK_STAGE_OK_NOTE_REFRESH_FAILED,
      },
    ];
    expect(receivingBulkApplyNeedsListReload(outcomes)).toBe(true);
  });

  it("append-note uses refreshed privateNotes after concurrent change (not stale GET)", async () => {
    const profileSpy = vi.fn().mockResolvedValue({ ok: true as const });
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, wire: minimalWire(1, "A") })
      .mockResolvedValueOnce({ ok: true, wire: minimalWire(3, "B") });

    const intent: ReceivingAppealPatchIntent = {
      appealId: "ap_1",
      body: {
        expectedRevision: 1,
        stageId: "ws_measure",
        serviceNote: "C",
        serviceNoteAppend: true,
      },
    };

    const deps: ReceivingBulkApplyTransportDeps = {
      fetchDetail: fetchSpy,
      patchStage: vi.fn().mockResolvedValue({ ok: true as const }),
      patchProfile: profileSpy,
    };

    const out = await applyOneReceivingBulkIntent(intent, { ...baseRow, stageId: "ws_new" }, deps);
    expect(out.ok).toBe(true);
    expect(profileSpy).toHaveBeenCalledWith("ap_1", {
      privateNotes: "B\nC",
      expectedRevision: 3,
    });
    expect(profileSpy.mock.calls[0][1].privateNotes).not.toContain("A");
  });

  it("pure merge preserves refreshed snapshot contents", () => {
    const snap = receivingBulkNoteSnapshotFromWire(minimalWire(3, "B"));
    const patch = receivingBulkProfileNotePatchFromSnapshot(snap, "C", true);
    expect(patch.expectedRevision).toBe(3);
    expect(patch.privateNotes).toBe(mergeServiceNote("B", "C", true));
    expect(patch.privateNotes).not.toMatch(/^A/);
  });

  it("profile 409 after stage does not claim full success", async () => {
    const deps: ReceivingBulkApplyTransportDeps = {
      fetchDetail: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, wire: minimalWire(1, "A") })
        .mockResolvedValueOnce({ ok: true, wire: minimalWire(2, "A") }),
      patchStage: vi.fn().mockResolvedValue({ ok: true as const }),
      patchProfile: vi.fn().mockResolvedValue({
        ok: false as const,
        code: "CONFLICT" as const,
        message: "version conflict",
      }),
    };

    const out = await applyOneReceivingBulkIntent(
      {
        appealId: "ap_1",
        body: { stageId: "ws_measure", serviceNote: "note", serviceNoteAppend: true },
      },
      baseRow,
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toBe("version_conflict");
  });

  it("refresh failure after stage blocks note PATCH with honest partial message", async () => {
    const profileSpy = vi.fn();
    const deps: ReceivingBulkApplyTransportDeps = {
      fetchDetail: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, wire: minimalWire(1, "A") })
        .mockResolvedValueOnce({ ok: false as const, code: "ERROR" as const, message: "network" }),
      patchStage: vi.fn().mockResolvedValue({ ok: true as const }),
      patchProfile: profileSpy,
    };

    const out = await applyOneReceivingBulkIntent(
      {
        appealId: "ap_1",
        body: { stageId: "ws_measure", serviceNote: "note", serviceNoteAppend: true },
      },
      baseRow,
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.message).toBe(RECEIVING_BULK_STAGE_OK_NOTE_REFRESH_FAILED);
    expect(out.stageApplied).toBe(true);
    expect(profileSpy).not.toHaveBeenCalled();
    expect(receivingBulkApplyNeedsListReload([out])).toBe(true);
  });

  it("note-only uses single GET snapshot for revision and privateNotes", async () => {
    const profileSpy = vi.fn().mockResolvedValue({ ok: true as const });
    const deps: ReceivingBulkApplyTransportDeps = {
      fetchDetail: vi.fn().mockResolvedValue({ ok: true, wire: minimalWire(5, "keep") }),
      patchStage: vi.fn(),
      patchProfile: profileSpy,
    };

    await applyOneReceivingBulkIntent(
      { appealId: "ap_1", body: { serviceNote: "tail", serviceNoteAppend: true } },
      { ...baseRow, stageId: RECEIVING_SYSTEM_STAGE.PAID },
      deps,
    );
    expect(deps.patchStage).not.toHaveBeenCalled();
    expect(profileSpy).toHaveBeenCalledWith("ap_1", {
      privateNotes: "keep\ntail",
      expectedRevision: 5,
    });
  });
});
