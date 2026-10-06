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
  UPSTREAM_TIMEOUT_MS,
} from "./remcard-proxy.ts";

type StubState = {
  lastCookie: string | null;
  hang: boolean;
};

const stubState: StubState = {
  lastCookie: null,
  hang: false,
};

let stubBaseUrl = "";

const stubServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", stubBaseUrl);
  stubState.lastCookie = request.headers.cookie ?? null;

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

  if (url.pathname === "/api/auth/redirect-test") {
    response.writeHead(302, { location: "/api/auth/me" });
    response.end();
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

  if (url.pathname === "/api/auth/me") {
    response.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": "remcard-token=session; Path=/; HttpOnly",
    });
    response.end(JSON.stringify({ user: null }));
    return;
  }

  if (url.pathname === "/api/auth/me" && request.method === "HEAD") {
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not found" }));
});

before(async () => {
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
  });

  it("rejects mutating requests from foreign origins", () => {
    assert.equal(isAllowedMutatingOrigin("http://evil.example"), false);
    assert.equal(isAllowedMutatingOrigin("http://localhost:3000"), true);
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
    assert.equal(Buffer.from(result.body).toString("utf8"), "%PDF-1.4 stub");
    assert.equal(stubState.lastCookie, "remcard-token=abc");
  });

  it("forwards redirect Location headers", async () => {
    const result = await proxyRemcardRequest({
      method: "GET",
      pathname: "/api/auth/redirect-test",
      search: "",
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
