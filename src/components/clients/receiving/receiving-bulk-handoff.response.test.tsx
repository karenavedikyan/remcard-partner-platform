import { describe, expect, it } from "vitest";
import {
  aggregateReceivingPatchResults,
  normalizeReceivingBatchResponse,
  receivingBulkConfirmTargetIds,
  receivingBulkErrorMessage,
  receivingBulkFailedIds,
  receivingBulkMergeSelection,
  type ReceivingCrmBatchAction,
} from "./receiving-bulk-handoff";

const ids = ["one", "two"];
const raw = (updatedIds: string[], skippedIds: string[] = [], failures: object[] = []) => ({
  updatedIds, skippedIds, failures,
});
const normalize = (
  payload: unknown,
  requested: string[] = ids,
  action: ReceivingCrmBatchAction = "archive",
) => normalizeReceivingBatchResponse(payload, { ids: requested, action });

describe("receiving batch: only explicitly confirmed requested records succeed", () => {
  it.each(["archive", "unarchive", "trash", "restore"] as const)(
    "%s accepts the actual K1 response without an action echo",
    (action) => {
      expect(normalize(raw(["two", "one", "one"]), ids, action))
        .toEqual({ ok: true, kind: "full", updatedIds: ids });
    },
  );

  it("accepts a matching optional action echo", () => {
    expect(normalize({ ...raw(ids), action: "archive" }))
      .toEqual({ ok: true, kind: "full", updatedIds: ids });
  });

  it("keeps omitted requested records pending instead of reporting full success", () => {
    const result = normalize(raw(["one"]));
    expect(result).toMatchObject({ ok: true, kind: "partial", updatedIds: ["one"] });
    expect(receivingBulkFailedIds(result)).toEqual(["two"]);
    expect(receivingBulkMergeSelection(ids, result)).toEqual(["two"]);
    expect(receivingBulkErrorMessage(result)).toBe("Обновлено: 1, пропущено: 1.");
  });

  it("ignores foreign IDs in every response collection", () => {
    const result = normalize(raw(["outside", "one"], ["foreign"], [{ id: "alien" }]));
    expect(result).toMatchObject({ ok: true, kind: "partial", updatedIds: ["one"] });
    expect(receivingBulkFailedIds(result)).toEqual(["two"]);
    expect(receivingBulkMergeSelection(ids, result)).toEqual(["two"]);
  });

  it.each(["skipped", "failure", "both"])("negative evidence wins over updatedIds: %s", (kind) => {
    const result = normalize(raw(
      ["one", "two"],
      kind !== "failure" ? ["two"] : [],
      kind !== "skipped" ? [{ id: "two", code: "CONFLICT" }] : [],
    ));
    expect(result).toMatchObject({ ok: true, kind: "partial", updatedIds: ["one"] });
    expect(receivingBulkMergeSelection(ids, result)).toEqual(["two"]);
    expect(receivingBulkErrorMessage(result)).toBe("Обновлено: 1, пропущено: 1.");
  });

  it("deduplicates requested IDs, successes and negative evidence", () => {
    const result = normalize(raw(["one", "one"], ["two", "two"], [
      { id: "two", code: "CONFLICT" }, { id: "two", code: "CONFLICT" },
    ]), ["one", "two", "one", "two"]);
    expect(receivingBulkFailedIds(result)).toEqual(["two"]);
    expect(receivingBulkErrorMessage(result)).toBe("Обновлено: 1, пропущено: 1.");
  });

  it.each([
    raw([]),
    raw(["outside"]),
    raw([], ["outside"], [{ id: "outside" }]),
    raw(ids, ids),
  ])("never reports full success with zero confirmed requested IDs: %j", (payload) => {
    const result = normalize(payload);
    expect(result.ok).toBe(false);
    expect(receivingBulkFailedIds(result)).toEqual(ids);
    expect(receivingBulkMergeSelection(ids, result)).toEqual(ids);
  });

  it.each([
    null, undefined, 42, "", [], {},
    { updatedIds: ids },
    { ...raw(ids), updatedIds: null },
    { ...raw(ids), skippedIds: "two" },
    { ...raw(ids), failures: null },
    { ...raw(ids), updatedIds: ["one", 7] },
    { ...raw(ids), failures: [null] },
    { ...raw(ids), failures: [{ id: 2 }] },
    { ...raw(ids), action: "restore" },
    { ...raw(ids), action: null },
  ])("fails closed for malformed or mismatching response: %j", (payload) => {
    const result = normalize(payload);
    expect(result.ok).toBe(false);
    expect(receivingBulkFailedIds(result)).toEqual(ids);
    expect(receivingBulkMergeSelection(ids, result)).toEqual(ids);
  });

  it("does not trim an opaque response ID into a requested success", () => {
    const result = normalize(raw(["one ", "two"]));
    expect(result).toMatchObject({ ok: true, kind: "partial", updatedIds: ["two"] });
    expect(receivingBulkFailedIds(result)).toEqual(["one"]);
  });

  it("rejects empty requests", () => {
    expect(normalize(raw(ids), [])).toMatchObject({ ok: false, preserveUi: true });
  });

  it("per-ID PATCH aggregation uses the same unique/contradiction rules", () => {
    const result = aggregateReceivingPatchResults([
      { appealId: "one", ok: true }, { appealId: "one", ok: true },
      { appealId: "two", ok: true }, { appealId: "two", ok: false, reason: "CONFLICT" },
    ]);
    expect(result).toMatchObject({ ok: true, kind: "partial", updatedIds: ["one"] });
    expect(receivingBulkErrorMessage(result)).toBe("Обновлено: 1, пропущено: 1.");
  });

  it("counts one record once even in legacy overlapping failure collections", () => {
    expect(receivingBulkErrorMessage({
      ok: true, kind: "partial", updatedIds: ["one"],
      skippedIds: ["two", "two"], failures: [{ id: "two" }, { id: "two" }],
    })).toBe("Обновлено: 1, пропущено: 1.");
  });

  it("confirm retry deduplicates targets and excludes earlier successes", () => {
    expect(receivingBulkConfirmTargetIds(["one", "two", "two"], new Set(["two"])))
      .toEqual(["two"]);
  });

  it("exhaustive per-ID evidence combinations never acknowledge omitted or contradictory records", () => {
    const requested = ["one", "two", "three"];
    for (let mask = 0; mask < 512; mask += 1) {
      const updated = requested.filter((_, i) => mask & (1 << (i * 3)));
      const skipped = requested.filter((_, i) => mask & (1 << (i * 3 + 1)));
      const failed = requested.filter((_, i) => mask & (1 << (i * 3 + 2)));
      const result = normalize(raw(
        [...updated, "foreign"], skipped, failed.map((id) => ({ id })),
      ), requested);
      const confirmed = requested.filter((id) =>
        updated.includes(id) && !skipped.includes(id) && !failed.includes(id));
      const pending = requested.filter((id) => !confirmed.includes(id));
      expect(result.ok ? result.updatedIds : []).toEqual(confirmed);
      expect(receivingBulkFailedIds(result)).toEqual(pending);
      expect(receivingBulkMergeSelection(requested, result)).toEqual(pending);
      expect(result.ok && result.kind === "full").toBe(pending.length === 0);
    }
  });
});
