import { describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import {
  bulkSnapshotMatches,
  classifyBulkApplyError,
  fetchBulkPreviews,
  runBulkApplyQueue,
} from "./adminPartnersBulkLifecycle";

describe("adminPartnersBulkLifecycle", () => {
  it("refuses silent partial preview success", async () => {
    const previewFn = vi.fn(async (userId: string) => {
      if (userId === "bad") throw new Error("blocked");
      return {
        preview: {
          effects: ["ok"],
          warnings: [],
          displayName: userId,
          confirmToken: `token-${userId}`,
        },
      };
    });
    const result = await fetchBulkPreviews(
      [
        { userId: "good", displayName: "Good" },
        { userId: "bad", displayName: "Bad" },
      ],
      "hide_catalog",
      previewFn,
    );
    expect("failures" in result).toBe(true);
    if ("failures" in result) {
      expect(result.failures).toHaveLength(1);
      expect(result.partial).toHaveLength(1);
    }
    expect(previewFn).toHaveBeenCalledTimes(2);
  });

  it("applies with bounded concurrency and matching tokens", async () => {
    const applyFn = vi.fn(async () => ({ ok: true }));
    const snapshot = {
      action: "archive_project" as const,
      reason: "Bulk reason",
      revision: 1,
      members: [
        { userId: "u1", displayName: "U1", confirmToken: "t1", effects: [], warnings: [] },
        { userId: "u2", displayName: "U2", confirmToken: "t2", effects: [], warnings: [] },
        { userId: "u3", displayName: "U3", confirmToken: "t3", effects: [], warnings: [] },
      ],
    };
    await runBulkApplyQueue({
      snapshot,
      applyFn,
      concurrency: 2,
      shouldStop: () => false,
      onRowStart: () => {},
      onRowDone: () => {},
    });
    expect(applyFn).toHaveBeenCalledTimes(3);
    expect(applyFn).toHaveBeenCalledWith("u1", "archive_project", "Bulk reason", "t1");
    expect(applyFn).toHaveBeenCalledWith("u2", "archive_project", "Bulk reason", "t2");
  });

  it("classifies network loss as unknown", () => {
    expect(classifyBulkApplyError(new RemcardApiError(0, "Сетевая ошибка"))).toBe("unknown");
    expect(classifyBulkApplyError(new RemcardApiError(403, "Forbidden"))).toBe("error");
  });

  it("marks queued rows as stopped when stopped before send", async () => {
    let sent = 0;
    const applyFn = vi.fn(async () => {
      sent += 1;
      if (sent === 1) return { ok: true };
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true };
    });
    const snapshot = {
      action: "hide_catalog" as const,
      reason: "R",
      revision: 1,
      members: [
        { userId: "u1", displayName: "U1", confirmToken: "t1", effects: [], warnings: [] },
        { userId: "u2", displayName: "U2", confirmToken: "t2", effects: [], warnings: [] },
        { userId: "u3", displayName: "U3", confirmToken: "t3", effects: [], warnings: [] },
      ],
    };
    let stop = false;
    const results = await runBulkApplyQueue({
      snapshot,
      applyFn,
      concurrency: 1,
      shouldStop: () => stop,
      onRowStart: (id) => {
        if (id === "u1") stop = true;
      },
      onRowDone: () => {},
    });
    expect(applyFn).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.outcome === "stopped").length).toBeGreaterThan(0);
  });

  it("detects snapshot drift", () => {
    const snapshot = {
      action: "hide_catalog" as const,
      reason: "R",
      revision: 1,
      members: [{ userId: "a", displayName: null, confirmToken: "t", effects: [], warnings: [] }],
    };
    expect(bulkSnapshotMatches(snapshot, "hide_catalog", "R", ["a"])).toBe(true);
    expect(bulkSnapshotMatches(snapshot, "hide_catalog", "Other", ["a"])).toBe(false);
  });
});
