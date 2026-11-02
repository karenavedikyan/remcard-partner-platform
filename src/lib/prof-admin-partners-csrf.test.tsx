import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPartnerAccountDelete,
  previewPartnerAccountDelete,
} from "./prof-admin-partners-api";
import { CSRF_COOKIE, CSRF_HEADER } from "./csrf-constants";

const syntheticId = "csrf-synthetic-partner";
const token = "csrf-synthetic-token";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = `${CSRF_COOKIE}=; Max-Age=0; Path=/`;
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("admin partner account deletion CSRF wire contract", () => {
  it("preview sends existing CSRF token with the unchanged reason", async () => {
    document.cookie = `${CSRF_COOKIE}=${token}; Path=/`;
    const fetchMock = vi.fn().mockResolvedValue(respond({ preview: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await previewPartnerAccountDelete(syntheticId, "synthetic reason");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/remcard/api/pro/admin/partners/${syntheticId}/account-delete/preview`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get(CSRF_HEADER)).toBe(token);
    expect(JSON.parse(init.body)).toEqual({ reason: "synthetic reason" });
  });

  it("bootstraps a missing cookie before sending the preview", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/csrf") {
        document.cookie = `${CSRF_COOKIE}=${token}; Path=/`;
        return respond({ ok: true });
      }
      return respond({ preview: {} });
    });
    vi.stubGlobal("fetch", fetchMock);

    await previewPartnerAccountDelete(syntheticId, "synthetic reason");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/csrf");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get(CSRF_HEADER)).toBe(token);
  });

  it("apply sends CSRF and preserves all explicit confirmation fields", async () => {
    document.cookie = `${CSRF_COOKIE}=${token}; Path=/`;
    const fetchMock = vi.fn().mockResolvedValue(respond({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await applyPartnerAccountDelete(syntheticId, "synthetic reason", "synthetic-confirm", "RC-QA-ONLY");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/remcard/api/pro/admin/partners/${syntheticId}/account-delete`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get(CSRF_HEADER)).toBe(token);
    expect(JSON.parse(init.body)).toEqual({
      reason: "synthetic reason",
      confirmToken: "synthetic-confirm",
      publicIdConfirm: "RC-QA-ONLY",
    });
  });

  it("does not retry or hide a rejected deletion", async () => {
    document.cookie = `${CSRF_COOKIE}=${token}; Path=/`;
    const fetchMock = vi.fn().mockResolvedValue(respond({ error: "CSRF_FAILED" }, 403));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      applyPartnerAccountDelete(syntheticId, "synthetic reason", "synthetic-confirm", "RC-QA-ONLY"),
    ).rejects.toMatchObject({ status: 403, message: "CSRF_FAILED" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
