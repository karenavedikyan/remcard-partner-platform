import { describe, expect, it } from "vitest";
import {
  aggregateReceivingPatchResults,
  buildReceivingBulkPatchIntents,
  normalizeReceivingBatchResponse,
  receivingBulkErrorMessage,
  receivingBulkMergeSelection,
  receivingBulkFailedIds,
  receivingBulkShouldRefetch,
  receivingToolbarToBatchAction,
} from "./receiving-bulk-handoff";

describe("P5 receiving bulk ↔ K1 batch (mocked)", () => {
  it("maps toolbar actions to K1 batch/archive scope and partial selection", () => {
    expect(receivingToolbarToBatchAction("archive-ask", "active")).toBe("archive");
    expect(receivingToolbarToBatchAction("unarchive-ask", "archive")).toBe("unarchive");
    expect(receivingToolbarToBatchAction("delete-ask", "active")).toBe("trash");
    expect(receivingToolbarToBatchAction("restore-ask", "trash")).toBe("restore");
    expect(receivingToolbarToBatchAction("edit-open", "active")).toBe("patch-multi");

    const raw = {
      action: "archive" as const,
      updatedIds: ["a1"],
      skippedIds: ["a2"],
      failures: [{ id: "a2", reason: "version_conflict" }],
    };
    const result = normalizeReceivingBatchResponse(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("partial");
    expect(receivingBulkFailedIds(result)).toContain("a2");
    expect(receivingBulkMergeSelection(["a1", "a2"], result)).toEqual(["a2"]);
  });

  it("stage ok + note fail: split intents, refetch, keep selection", () => {
    const { intents } = buildReceivingBulkPatchIntents(
      ["x"],
      { stageId: "ws_measure", serviceNote: "n", appendNote: true },
      { stageBlocked: false, revisions: { x: 2 } },
    );
    expect(intents).toHaveLength(2);
    expect(intents[0]?.part).toBe("stage");
    expect(intents[1]?.part).toBe("note");

    const result = aggregateReceivingPatchResults([
      { appealId: "x", ok: true, part: "stage" },
      { appealId: "x", ok: false, part: "note", reason: "note_patch_failed" },
    ]);
    expect(result.ok && result.kind).toBe("partial");
    expect(receivingBulkErrorMessage(result)).toMatch(/Этап применён/);
    expect(receivingBulkMergeSelection(["x"], result)).toEqual(["x"]);
    expect(receivingBulkShouldRefetch(result)).toBe(true);
  });
});
