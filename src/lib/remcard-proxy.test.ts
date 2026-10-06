import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import {
  buildProxyNextResponse,
  filterAllowedCookies,
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
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/logout"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/certificate/issue"), false);
    assert.equal(isAllowedProxyRoute("POST", "/api/store/certificate"), true);
    assert.equal(isAllowedProxyRoute("DELETE", "/api/auth/me"), false);
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
      validateProxyLocation(`${stubBaseUrl}/?auth=ok`, stubBaseUrl),
      `${stubBaseUrl}/?auth=ok`,
    );
    assert.equal(
      validateProxyLocation("https://evil.example/oauth", stubBaseUrl),
      null,
    );
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
