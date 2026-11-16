import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildProxyNextResponse,
  isAllowedProxyRoute,
  proxyRemcardRequest,
  type ProxyRequestInput,
} from "./remcard-proxy";

const ID = "0b5d7a1e-3c2f-4f4e-9a88-1f2e3d4c5b6a";
const ITEM_PATH = `/api/pro/notifications/${ID}`;

function input(overrides: Partial<ProxyRequestInput>): ProxyRequestInput {
  return {
    method: "GET",
    pathname: ITEM_PATH,
    search: "",
    contentType: null,
    cookieHeader: "remcard-token=session-cookie",
    origin: null,
    csrfHeader: null,
    idempotencyKeyHeader: null,
    ...overrides,
  };
}

describe("BFF policy for the single PROF notification item", () => {
  const upstream = vi.fn();

  beforeEach(() => {
    process.env.REMCARD_API_BASE_URL = "http://127.0.0.1:39999";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3420";
    upstream.mockReset();
    vi.stubGlobal("fetch", upstream);
    // The proxy is server-only code; run it as the Next route handler would.
    vi.stubGlobal("window", undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows GET and the existing PATCH for this exact path only", () => {
    expect(isAllowedProxyRoute("GET", ITEM_PATH)).toBe(true);
    expect(isAllowedProxyRoute("PATCH", ITEM_PATH)).toBe(true);
    expect(isAllowedProxyRoute("POST", ITEM_PATH)).toBe(false);
    expect(isAllowedProxyRoute("PUT", ITEM_PATH)).toBe(false);
    expect(isAllowedProxyRoute("DELETE", ITEM_PATH)).toBe(false);
    expect(isAllowedProxyRoute("GET", `${ITEM_PATH}/extra`)).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/pro/notifications/a/b")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/pro/notifications/")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/pro/admin/notifications/n1")).toBe(false);
    expect(isAllowedProxyRoute("GET", "/api/pro/notifications/..%2Fadmin")).toBe(false);
  });

  it("forwards an authorized GET with the session cookie, no-store, and relays 200 and 404 unchanged", async () => {
    upstream
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ item: { id: ID, title: "Запрос на лимит" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Не найдено" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      );

    const ok = await proxyRemcardRequest(input({}));
    expect(ok.ok).toBe(true);
    const [url, init] = upstream.mock.calls[0]!;
    expect(String(url)).toBe(`http://127.0.0.1:39999${ITEM_PATH}`);
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).cache).toBe("no-store");
    expect(new Headers((init as RequestInit).headers).get("cookie")).toContain("remcard-token=session-cookie");
    const response = buildProxyNextResponse(ok);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).item.id).toBe(ID);

    const foreign = await proxyRemcardRequest(input({}));
    const foreignResponse = buildProxyNextResponse(foreign);
    expect(foreignResponse.status).toBe(404);
    expect(foreignResponse.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps PATCH behind the origin check and rejects unsupported methods before upstream", async () => {
    const badOrigin = await proxyRemcardRequest(
      input({ method: "PATCH", contentType: "application/json", bodyText: "{}", origin: "https://evil.example" }),
    );
    expect(badOrigin.ok).toBe(false);
    if (!badOrigin.ok) expect(badOrigin.body).toContain("Origin not allowed");

    for (const method of ["POST", "DELETE", "PUT"]) {
      const result = await proxyRemcardRequest(input({ method, origin: "http://127.0.0.1:3420" }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(403);
        expect(result.body).toContain("Path not allowed");
      }
    }
    const extra = await proxyRemcardRequest(input({ pathname: `${ITEM_PATH}/extra` }));
    expect(extra.ok).toBe(false);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("still forwards the existing PATCH from an allowed origin", async () => {
    upstream.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await proxyRemcardRequest(
      input({ method: "PATCH", contentType: "application/json", bodyText: JSON.stringify({ read: true }), origin: "http://127.0.0.1:3420" }),
    );
    expect(result.ok).toBe(true);
    expect((upstream.mock.calls[0]![1] as RequestInit).method).toBe("PATCH");
  });
});
