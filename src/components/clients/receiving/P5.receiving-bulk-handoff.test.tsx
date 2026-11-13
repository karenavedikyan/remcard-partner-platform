import { describe, expect, it } from "vitest";
import {
  normalizeReceivingBatchResponse,
  receivingBulkMergeSelection,
  receivingBulkFailedIds,
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
});
