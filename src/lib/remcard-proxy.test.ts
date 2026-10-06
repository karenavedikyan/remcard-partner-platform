import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import {
  buildProxyNextResponse,
  filterAllowedCookies,
  filterAllowedSetCookies,
  isAllowedMutatingOrigin,
  isAllowedProxyRoute,
  normalizeProxyPath,
  proxyRemcardRequest,
  responseMustNotIncludeBody,
  UPSTREAM_TIMEOUT_MS,
  validateProxyLocation,
} from "./remcard-proxy.ts";

type StubState = {
  lastCookie: string | null;
  lastAuthorization: string | null;
  hang: boolean;
};

const stubState: StubState = {
  lastCookie: null,
  lastAuthorization: null,
  hang: false,
};

let stubBaseUrl = "";

const stubServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", stubBaseUrl);
  stubState.lastCookie = request.headers.cookie ?? null;
  stubState.lastAuthorization = request.headers.authorization ?? null;

  if (stubState.hang) {
    return;
  }

  if (url.pathname === "/api/certificate/demo/pdf") {
    response.writeHead(200, {
      "content-type": "application/pdf",
      "set-cookie": "remcard-token=abc; Path=/; HttpOnly",
    });
    response.end(Buffer.from("%PDF-1.4 stub"));
    return;
  }

  if (url.pathname === "/api/auth/verify-code" && request.method === "POST") {
    let payload: { code?: string } = {};
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { code?: string };
    } catch {
      payload = {};
    }

    if (payload.code === "123456") {
      response.writeHead(200, {
        "content-type": "application/json",
        "set-cookie": "remcard-token=verified; Path=/; HttpOnly",
      });
      response.end(JSON.stringify({ user: { id: "user-1", displayName: "Test" } }));
      return;
    }

    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Неверный или просроченный код" }));
    return;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    response.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": [
        "remcard-token=; Path=/; Max-Age=0",
        "remcard-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ],
    });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === "/api/auth/me" && request.method === "HEAD") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (url.pathname === "/api/auth/me") {
    const mode = url.searchParams.get("mode");
    if (mode === "redirect-relative") {
      response.writeHead(302, { location: "/api/auth/me" });
      response.end();
      return;
    }
    if (mode === "redirect-external") {
      response.writeHead(302, { location: "https://evil.example/oauth" });
      response.end();
      return;
    }
    if (mode === "no-content") {
      response.writeHead(204);
      response.end();
      return;
    }
    if (mode === "not-modified") {
      response.writeHead(304, { etag: '"v1"' });
      response.end();
      return;
    }
    if (mode === "mixed-cookies") {
      response.writeHead(200, {
        "content-type": "application/json",
        "set-cookie": [
          "remcard-token=session; Path=/; HttpOnly",
          "unexpected_cookie=evil; Path=/; HttpOnly",
        ],
      });
      response.end(JSON.stringify({ user: null }));
      return;
    }

    response.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": "remcard-token=session; Path=/; HttpOnly",
    });
    response.end(JSON.stringify({ user: null, query: url.search }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not found" }));
});

before(async () => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  delete process.env.REMCARD_API_BASIC_USER;
  delete process.env.REMCARD_API_BASIC_PASSWORD;
  await new Promise<void>((resolve) => stubServer.listen(0, "127.0.0.1", resolve));
  const address = stubServer.address() as AddressInfo;
  stubBaseUrl = `http://127.0.0.1:${address.port}`;
  process.env.REMCARD_API_BASE_URL = stubBaseUrl;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    stubServer.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("remcard proxy transport checks", () => {
  it("normalizes paths and rejects traversal", () => {
    assert.equal(normalizeProxyPath(["api", "auth", "me"]), "/api/auth/me");
    assert.equal(normalizeProxyPath(["api", "..", "auth", "me"]), null);
    assert.equal(normalizeProxyPath(["api", "auth", "me%2Fevil"]), null);
  });

  it("allows only verified route/method pairs", () => {
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/me"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/auth/verify-code"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/verify-code"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/logout"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/certificate/issue"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/certificate/available-partners"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/store/certificate/clxyz1234567890123456789"),
      true,
    );
    assert.equal(isAllowedProxyRoute("POST", "/api/store/certificate"), true);
    assert.equal(isAllowedProxyRoute("DELETE", "/api/auth/me"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/partnership/incoming-count"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/partnership/remind"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/partnership/part-123"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/partnerships/part-123/term-change"), true);
    assert.equal(
      isAllowedProxyRoute("POST", "/api/partnerships/part-123/term-change/req-1/respond"),
      true,
    );
    assert.equal(isAllowedProxyRoute("PATCH", "/api/partnerships/part-123"), false);
  });

  it("forwards only allowlisted cookies", () => {
    assert.equal(
      filterAllowedCookies("remcard-token=abc; other=secret; remcard-token=def"),
      "remcard-token=abc; remcard-token=def",
    );
    assert.equal(filterAllowedCookies("other=secret"), null);
    assert.equal(filterAllowedCookies("oauth_vk_state=abc; remcard-token=abc"), "remcard-token=abc");
  });

  it("rejects missing or foreign origins for mutating requests", () => {
    assert.equal(isAllowedMutatingOrigin(null), false);
    assert.equal(isAllowedMutatingOrigin("http://evil.example"), false);
    assert.equal(isAllowedMutatingOrigin("http://localhost:3000"), true);
  });

  it("detects statuses that must not include a body", () => {
    assert.equal(responseMustNotIncludeBody(204, "GET"), true);
    assert.equal(responseMustNotIncludeBody(205, "GET"), true);
    assert.equal(responseMustNotIncludeBody(304, "GET"), true);
    assert.equal(responseMustNotIncludeBody(200, "HEAD"), true);
    assert.equal(responseMustNotIncludeBody(200, "GET"), false);
  });

  it("allows only trusted redirect locations", () => {
    assert.equal(validateProxyLocation("/api/auth/me", stubBaseUrl), "/api/auth/me");
    assert.equal(
      validateProxyLocation("/api/auth/me?next=1#frag", stubBaseUrl),
      "/api/auth/me?next=1#frag",
    );
    assert.equal(
      validateProxyLocation(`${stubBaseUrl}/?auth=ok`, stubBaseUrl),
      `${stubBaseUrl}/?auth=ok`,
    );
    assert.equal(
      validateProxyLocation("https://evil.example/oauth", stubBaseUrl),
      null,
    );
  });

  it("rejects Location bypasses via backslash, protocol-relative, control chars, and userinfo", () => {
    const backslashBypass = `/\\evil.example/path`;
    assert.equal(validateProxyLocation(backslashBypass, stubBaseUrl), null);
    assert.notEqual(
      new URL(backslashBypass, "https://cabinet.example").href,
      "https://cabinet.example/api/auth/me",
    );

    assert.equal(validateProxyLocation("//evil.example/path", stubBaseUrl), null);
    assert.equal(validateProxyLocation("/api/auth/me%0d%0aInjected: x", stubBaseUrl), null);
    assert.equal(
      validateProxyLocation("https://user:pass@127.0.0.1:1/secret", stubBaseUrl),
      null,
    );
    assert.equal(validateProxyLocation("javascript:alert(1)", stubBaseUrl), null);
  });

  it("rejects dot-segment Location normalization to protocol-relative paths", () => {
    const backend = "https://backend.example";
    const cabinetOrigin = "https://cabinet.example";
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = cabinetOrigin;

    try {
      for (const input of ["/a/..//evil.example/path", "/%2e//evil.example/path"]) {
        const result = validateProxyLocation(input, backend);
        assert.equal(result, null, `expected null for ${input}`);
        assert.equal(new URL(input, backend).pathname, "//evil.example/path");
      }

      assert.equal(
        validateProxyLocation("/api/partners/../auth/me", backend),
        "/api/auth/me",
      );
      assert.equal(
        new URL("/api/partners/../auth/me", cabinetOrigin).href,
        "https://cabinet.example/api/auth/me",
      );

      const trustedRelative = validateProxyLocation("/dashboard?tab=1", backend);
      assert.equal(trustedRelative, "/dashboard?tab=1");
      assert.equal(
        new URL(trustedRelative!, cabinetOrigin).origin,
        cabinetOrigin,
      );
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  });

  it("filters upstream Set-Cookie names on responses", () => {
    const filtered = filterAllowedSetCookies([
      "remcard-token=abc; Path=/; HttpOnly",
      "unexpected_cookie=evil; Path=/; HttpOnly",
      "remcard-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]);
    assert.equal(filtered.length, 2);
    assert.match(filtered[0] ?? "", /^remcard-token=abc/);
    assert.match(filtered[1] ?? "", /Expires=Thu, 01 Jan 1970/);
  });

  it("buildProxyNextResponse never forwards disallowed Set-Cookie headers", () => {
    const response = buildProxyNextResponse({
      ok: true,
      status: 200,
      body: new TextEncoder().encode("{}").buffer,
      contentType: "application/json",
      setCookies: ["unexpected_cookie=value; Path=/; HttpOnly"],
      location: null,
    });

    assert.equal(response.headers.get("set-cookie"), null);
  });

  it("proxies PDF bytes without text corruption", async () => {
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/certificate/demo/pdf",
      search: "",
      contentType: null,
      cookieHeader: "remcard-token=abc; evil=1",
      origin: null,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.contentType, "application/pdf");
    assert.equal(Buffer.from(result.body!).toString("utf8"), "%PDF-1.4 stub");
    assert.equal(stubState.lastCookie, "remcard-token=abc");
  });

  it("preserves query strings on upstream requests", async () => {
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "?source=bff",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    const payload = JSON.parse(Buffer.from(result.body!).toString("utf8")) as {
      query: string;
    };
    assert.equal(payload.query, "?source=bff");
  });

  it("forwards trusted redirect Location headers", async () => {
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "?mode=redirect-relative",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.status, 302);
    assert.equal(result.location, "/api/auth/me");
  });

  it("drops external redirect Location headers", async () => {
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "?mode=redirect-external",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.status, 302);
    assert.equal(result.location, null);
    const response = buildProxyNextResponse(result);
    assert.equal(response.headers.get("location"), null);
  });

  it("builds no-body responses for 204 and 304", async () => {
    for (const [mode, status] of [
      ["no-content", 204],
      ["not-modified", 304],
    ] as const) {
      const result = await proxyRemcardRequest({
        method: "GET",
        pathname: "/api/auth/me",
        search: `?mode=${mode}`,
        contentType: null,
        cookieHeader: null,
        origin: null,
      });

      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }

      assert.equal(result.body, null);
      const response = buildProxyNextResponse(result);
      assert.equal(response.status, status);
      assert.equal(response.headers.get("content-length"), null);
    }
  });

  it("forwards only allowlisted Set-Cookie headers from upstream", async () => {
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "?mode=mixed-cookies",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.setCookies.length, 1);
    assert.match(result.setCookies[0] ?? "", /^remcard-token=session/);

    const response = buildProxyNextResponse(result);
    const cookies = response.headers.getSetCookie?.() ?? [];
    assert.equal(cookies.length, 1);
    assert.match(cookies[0] ?? "", /^remcard-token=session/);
  });

  it("forwards multiple Set-Cookie headers on logout", async () => {
    const result = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/auth/logout",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: "{}",
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.setCookies.length, 2);
    const response = buildProxyNextResponse(result);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
  });

  it("blocks disallowed paths and foreign origins", async () => {
    const blockedPath = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/admin/secret",
      search: "",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });
    assert.equal(blockedPath.ok, false);
    if (blockedPath.ok) {
      return;
    }
    assert.equal(blockedPath.status, 403);

    const blockedOrigin = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/auth/logout",
      search: "",
      contentType: "application/json",
      cookieHeader: null,
      origin: "http://evil.example",
      bodyText: "{}",
    });
    assert.equal(blockedOrigin.ok, false);
    if (blockedOrigin.ok) {
      return;
    }
    assert.equal(blockedOrigin.status, 403);

    const missingOrigin = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/auth/logout",
      search: "",
      contentType: "application/json",
      cookieHeader: null,
      origin: null,
      bodyText: "{}",
    });
    assert.equal(missingOrigin.ok, false);
    if (missingOrigin.ok) {
      return;
    }
    assert.equal(missingOrigin.status, 403);
  });

  it("rejects backend URLs with embedded credentials", async () => {
    process.env.REMCARD_API_BASE_URL = "http://user:pass@127.0.0.1:9/api";
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });
    process.env.REMCARD_API_BASE_URL = stubBaseUrl;

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.status, 503);
    assert.match(result.body, /must not include credentials/);
  });

  it("requires both upstream Basic Auth env vars when one is set", async () => {
    process.env.REMCARD_API_BASIC_USER = "test-user";
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });
    delete process.env.REMCARD_API_BASIC_USER;

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.status, 503);
    assert.match(result.body, /must both be set/);
  });

  it("sends upstream Basic Auth only from server env", async () => {
    process.env.REMCARD_API_BASIC_USER = "bff-user";
    process.env.REMCARD_API_BASIC_PASSWORD = "bff-pass";
    stubState.lastAuthorization = null;

    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });

    delete process.env.REMCARD_API_BASIC_USER;
    delete process.env.REMCARD_API_BASIC_PASSWORD;

    assert.equal(result.ok, true);
    assert.match(stubState.lastAuthorization ?? "", /^Basic /);
  });

  it("proxies verify-code login with origin check and session cookie", async () => {
    const success = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/auth/verify-code",
      search: "",
      contentType: "application/json",
      cookieHeader: "oauth_vk_state=temp; remcard-token=old",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ code: "123456" }),
    });

    assert.equal(success.ok, true);
    if (!success.ok) {
      return;
    }

    assert.equal(success.status, 200);
    assert.equal(success.setCookies.length, 1);
    assert.match(success.setCookies[0] ?? "", /^remcard-token=verified/);
    assert.equal(stubState.lastCookie, "remcard-token=old");

    const blocked = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/auth/verify-code",
      search: "",
      contentType: "application/json",
      cookieHeader: null,
      origin: "http://evil.example",
      bodyText: JSON.stringify({ code: "123456" }),
    });

    assert.equal(blocked.ok, false);
    if (blocked.ok) {
      return;
    }
    assert.equal(blocked.status, 403);

    const failure = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/auth/verify-code",
      search: "",
      contentType: "application/json",
      cookieHeader: null,
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ code: "000000" }),
    });

    assert.equal(failure.ok, true);
    if (!failure.ok) {
      return;
    }
    assert.equal(failure.status, 401);
    assert.equal(failure.setCookies.length, 0);
  });

  it("times out hung upstream requests", async () => {
    stubState.hang = true;
    const started = Date.now();
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/me",
      search: "",
      contentType: null,
      cookieHeader: null,
      origin: null,
    });
    stubState.hang = false;

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.status, 504);
    assert.ok(Date.now() - started >= UPSTREAM_TIMEOUT_MS - 250);
  });
});
