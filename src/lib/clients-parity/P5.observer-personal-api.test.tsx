import { afterEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import {
  applyObserverPersonalEdit,
  isPersonalPersistProxyBlocked,
  moveObserverPersonalBucket,
  patchObserverPersonalMeta,
  personalMutationAppliedIds,
  personalMutationFailedIds,
  personalMutationRetainSelectedIds,
  postObserverPersonalBatch,
  restoreObserverPersonal,
  runObserverPersonalConfirmAction,
  saveObserverPersonalBulkTag,
  saveObserverPersonalSingle,
} from "./observer-personal-api";

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes("/api/csrf")) return new Response("", { status: 200 });
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("P5 observer-personal-api (K5 @ 86ac3e35)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("patch uses referred-appeals personal-meta and returns meta", async () => {
    stubFetch(async (url, init) => {
      expect(url).toContain("/api/remcard/api/pro/referred-appeals/a1/personal-meta");
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(String(init?.body))).toEqual({ tag: "urgent", alias: null, note: null });
      return new Response(
        JSON.stringify({
          meta: {
            appealId: "a1",
            alias: null,
            tag: "urgent",
            note: null,
            bucket: "active",
            version: 2,
            updatedAt: "2026-11-13T00:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    const result = await patchObserverPersonalMeta("a1", { tag: "urgent", alias: null, note: null });
    expect(result.ok).toBe(true);
  });

  it("batch best_effort maps processed/skipped to partial", async () => {
    stubFetch(async (url, init) => {
      expect(url).toContain("personal-batch");
      expect(JSON.parse(String(init?.body)).action).toBe("setTag");
      return new Response(
        JSON.stringify({
          action: "setTag",
          mode: "best_effort",
          processedCount: 1,
          skippedCount: 1,
          processed: [
            {
              appealId: "a1",
              alias: null,
              tag: "t",
              note: null,
              bucket: "active",
              version: 1,
              updatedAt: "2026-11-13T00:00:00Z",
            },
          ],
          skipped: [{ appealId: "a2", reason: "version_conflict" }],
        }),
        { status: 200 },
      );
    });
    const result = await postObserverPersonalBatch({ action: "setTag", ids: ["a1", "a2"], tag: "t" });
    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "partial") {
      expect(result.appliedIds).toEqual(["a1"]);
      expect(result.failed[0].appealId).toBe("a2");
    }
  });

  it("403 INELIGIBLE is explicit error not blocked_contract", async () => {
    stubFetch(async () => new Response(JSON.stringify({ error: "INELIGIBLE", code: "INELIGIBLE" }), { status: 403 }));
    const result = await patchObserverPersonalMeta("a1", { tag: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("error");
      expect(result).toMatchObject({ status: 403 });
    }
  });

  it("409 VERSION_CONFLICT maps to conflict", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ code: "VERSION_CONFLICT", details: { currentVersion: 4 } }), { status: 409 }),
    );
    const result = await patchObserverPersonalMeta("a1", { tag: "x", expectedVersion: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("conflict");
  });

  it("proxy missing route stays blocked_contract", async () => {
    stubFetch(async () => new Response(JSON.stringify({ code: "PROXY_ROUTE_NOT_ALLOWED" }), { status: 404 }));
    const result = await patchObserverPersonalMeta("a1", { tag: "t" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("blocked_contract");
  });

  it("single move uses PATCH action move", async () => {
    stubFetch(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ action: "move", target: "archived", expectedVersion: 3 });
      return new Response(
        JSON.stringify({
          meta: {
            appealId: "x",
            alias: null,
            tag: null,
            note: null,
            bucket: "archived",
            version: 4,
            updatedAt: "2026-11-13T00:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    await moveObserverPersonalBucket(["x"], "archived", { expectedVersions: { x: 3 } });
  });

  it("restore single uses PATCH action restore", async () => {
    stubFetch(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ action: "restore" });
      return new Response(
        JSON.stringify({
          meta: {
            appealId: "x",
            alias: null,
            tag: null,
            note: null,
            bucket: "active",
            version: 2,
            updatedAt: "2026-11-13T00:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    await restoreObserverPersonal(["x"]);
  });

  it("save helpers wire to K5 bodies", async () => {
    const fetchMock = stubFetch(async (url, init) => {
      if (String(url).includes("personal-batch")) {
        return new Response(
          JSON.stringify({
            action: "setTag",
            mode: "best_effort",
            processedCount: 2,
            skippedCount: 0,
            processed: [
              {
                appealId: "1",
                alias: null,
                tag: "fri",
                note: null,
                bucket: "active",
                version: 1,
                updatedAt: "2026-11-13T00:00:00Z",
              },
              {
                appealId: "2",
                alias: null,
                tag: "fri",
                note: null,
                bucket: "active",
                version: 1,
                updatedAt: "2026-11-13T00:00:00Z",
              },
            ],
            skipped: [],
          }),
          { status: 200 },
        );
      }
      expect(JSON.parse(String(init?.body))).toMatchObject({ alias: "X" });
      return new Response(
        JSON.stringify({
          meta: {
            appealId: "id-9",
            alias: "X",
            tag: "",
            note: "",
            bucket: "active",
            version: 1,
            updatedAt: "2026-11-13T00:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    await saveObserverPersonalSingle("id-9", { alias: "X", tag: "", note: "" });
    await saveObserverPersonalBulkTag(["1", "2"], "fri");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });

  it("isPersonalPersistProxyBlocked ignores ordinary 404", () => {
    expect(isPersonalPersistProxyBlocked(new RemcardApiError(404, "x", { code: "NOT_FOUND" }))).toBe(false);
  });

  it("batch with missing processed/skipped arrays is safe", async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify({
          action: "setTag",
          mode: "best_effort",
          processedCount: 0,
          skippedCount: 0,
        }),
        { status: 200 },
      ),
    );
    const result = await postObserverPersonalBatch({ action: "setTag", ids: ["a1"], tag: "t" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.preserveUi).toBe(true);
  });

  it("confirm trash maps to move target trash (before restore-only trash bucket UI)", async () => {
    stubFetch(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({ action: "move", target: "trash" });
      return new Response(
        JSON.stringify({
          meta: {
            appealId: "z",
            alias: null,
            tag: null,
            note: null,
            bucket: "trash",
            version: 2,
            updatedAt: "2026-11-13T00:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    await runObserverPersonalConfirmAction("trash", ["z"]);
  });

  it("confirm restore from trash uses restore action", async () => {
    stubFetch(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ action: "restore" });
      return new Response(
        JSON.stringify({
          meta: {
            appealId: "z",
            alias: null,
            tag: null,
            note: null,
            bucket: "active",
            version: 3,
            updatedAt: "2026-11-13T00:00:00Z",
          },
        }),
        { status: 200 },
      );
    });
    await runObserverPersonalConfirmAction("restore", ["z"]);
  });

  it("partial retains failed ids for selection helper", async () => {
    const partial = {
      ok: true as const,
      kind: "partial" as const,
      appliedIds: ["ok"],
      failed: [{ appealId: "bad", code: "version_conflict", message: "x" }],
    };
    expect(personalMutationFailedIds(partial)).toEqual(["bad"]);
    expect(personalMutationAppliedIds(partial)).toEqual(["ok"]);
    expect(personalMutationRetainSelectedIds(["ok"], partial)).toEqual(expect.arrayContaining(["ok", "bad"]));
  });

  it("applyObserverPersonalEdit bulk uses setTag only", async () => {
    stubFetch(async (url, init) => {
      expect(String(url)).toContain("personal-batch");
      expect(JSON.parse(String(init?.body))).toMatchObject({ action: "setTag", tag: "vip" });
      return new Response(
        JSON.stringify({
          action: "setTag",
          mode: "best_effort",
          processedCount: 1,
          skippedCount: 0,
          processed: [
            {
              appealId: "1",
              alias: null,
              tag: "vip",
              note: null,
              bucket: "active",
              version: 1,
              updatedAt: "2026-11-13T00:00:00Z",
            },
          ],
          skipped: [],
        }),
        { status: 200 },
      );
    });
    await applyObserverPersonalEdit("bulk", ["1"], { alias: "ignored", tag: "vip", note: "n" });
  });
});
