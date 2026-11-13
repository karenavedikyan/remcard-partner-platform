import { afterEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import {
  isPersonalPersistProxyBlocked,
  moveObserverPersonalBucket,
  patchObserverPersonalMeta,
  postObserverPersonalBatch,
  saveObserverPersonalBulkTag,
  saveObserverPersonalSingle,
} from "./observer-personal-api";

describe("P5 observer-personal-api (mocked BFF)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps proxy 403 to blocked_contract", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: "PROXY_ROUTE_NOT_ALLOWED" }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await patchObserverPersonalMeta("a1", { tag: "t" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("blocked_contract");
      expect(result.blockerId).toBe("BLK-OBSERVER-PERSONAL-PERSIST");
    }
  });

  it("patch sends PATCH personal-meta path", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/csrf")) {
        return new Response("", { status: 200 });
      }
      expect(url).toContain("/api/remcard/api/pro/referred-appeals/a1/personal-meta");
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(String(init?.body))).toEqual({ tag: "urgent" });
      return new Response(JSON.stringify({ ok: true, meta: { tag: "urgent" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await patchObserverPersonalMeta("a1", { tag: "urgent" });
    expect(result.ok).toBe(true);
  });

  it("batch partial keeps failed ids", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/csrf")) return new Response("", { status: 200 });
      return new Response(
        JSON.stringify({
          ok: true,
          applied: ["a1"],
          failed: [{ appealId: "a2", code: "FORBIDDEN", message: "nein" }],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await postObserverPersonalBatch({ op: "set-bucket", ids: ["a1", "a2"], bucket: "archived" });
    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "partial") {
      expect(result.appliedIds).toEqual(["a1"]);
      expect(result.failed[0].appealId).toBe("a2");
    }
  });

  it("save single delegates to patch", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/csrf")) return new Response("", { status: 200 });
      return new Response(JSON.stringify({ meta: { alias: "X", tag: "", note: "" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await saveObserverPersonalSingle("id-9", { alias: "X", tag: "", note: "" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("bulk tag uses personal-batch", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/csrf")) return new Response("", { status: 200 });
      expect(url).toContain("personal-batch");
      expect(JSON.parse(String(init?.body))).toEqual({ op: "set-tag", ids: ["1", "2"], tag: "fri" });
      return new Response(JSON.stringify({ ok: true, applied: ["1", "2"] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await saveObserverPersonalBulkTag(["1", "2"], "fri");
  });

  it("move bucket uses set-bucket op", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/csrf")) return new Response("", { status: 200 });
      expect(JSON.parse(String(init?.body)).op).toBe("set-bucket");
      return new Response(JSON.stringify({ ok: true, applied: ["1"] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await moveObserverPersonalBucket(["1"], "trash");
  });

  it("isPersonalPersistProxyBlocked detects RemcardApiError", () => {
    expect(
      isPersonalPersistProxyBlocked(new RemcardApiError(404, "x", { code: "NOT_IMPLEMENTED" })),
    ).toBe(true);
  });
});
