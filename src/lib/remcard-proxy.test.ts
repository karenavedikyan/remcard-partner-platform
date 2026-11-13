import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { buildRemcardProxyRequestInput } from "./remcard-proxy-bff.ts";
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
  lastIdempotencyKey: string | null;
  lastRewardBody: string | null;
  hang: boolean;
};

const stubState: StubState = {
  lastCookie: null,
  lastAuthorization: null,
  lastIdempotencyKey: null,
  lastRewardBody: null,
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

  if (url.pathname === "/api/account/consent") {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    response.writeHead(payload.legalDocumentId === "old-doc" ? 409 : 200, {
      "content-type": "application/json",
    });
    response.end(JSON.stringify(payload.legalDocumentId === "old-doc"
      ? { error: "DOCUMENT_VERSION_MISMATCH", activeLegalDocumentId: "new-doc", version: "2" }
      : { ok: true, consentId: "fixture", legalDocumentId: payload.legalDocumentId, version: "2" }));
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

  if (url.pathname === "/api/pro/activity/session-visit" && request.method === "POST") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, recorded: true }));
    return;
  }

  if (url.pathname === "/api/auth/me" && request.method === "HEAD") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (/^\/api\/pro\/wallet\/order-rewards\/c[a-z0-9]{20,}$/i.test(url.pathname)) {
    stubState.lastIdempotencyKey = request.headers["idempotency-key"] ?? null;
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    stubState.lastRewardBody = Buffer.concat(chunks).toString("utf8");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ reward: null, permissions: null }));
    return;
  }

  if (/^\/api\/bonus\/[^/]+\/pay$/i.test(url.pathname) && request.method === "POST") {
    stubState.lastIdempotencyKey = request.headers["idempotency-key"] ?? null;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ bonus: { id: "bonus-stub", status: "PAID" } }));
    return;
  }

  if (/^\/api\/bonus\/[^/]+\/payout-actions$/i.test(url.pathname) && request.method === "GET") {
    stubState.lastIdempotencyKey = request.headers["idempotency-key"] ?? null;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ canRecordCash: true, canRecordTransfer: false }));
    return;
  }

  if (url.pathname === "/api/store/order" && request.method === "POST") {
    stubState.lastIdempotencyKey = request.headers["idempotency-key"] ?? null;
    response.writeHead(201, {
      "content-type": "application/json",
      ...(stubState.lastIdempotencyKey === "replay-key"
        ? { "Idempotent-Replayed": "true" }
        : {}),
    });
    response.end(
      JSON.stringify({
        order: { id: "ord-stub-1" },
        summary: {
          totalAmount: 1000,
          discountAmount: 100,
          isSelfScan: false,
          proBonusAmount: 100,
        },
      }),
    );
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
  it("requires a document ID for cabinet consents without weakening Origin", async () => {
    const input = {
      method: "POST", pathname: "/api/account/consent", search: "",
      contentType: "application/json", cookieHeader: "remcard-token=synthetic",
      origin: "http://localhost:3000",
    };
    for (const bodyText of ['{}', '{"kind":"TERMS"}', '{"legalDocumentId":null}',
      '{"legalDocumentId":""}', '{"legalDocumentId":123}', 'broken-json']) {
      const res = await proxyRemcardRequest({ ...input, bodyText });
      assert.equal(res.status, 400);
      assert.equal(res.ok, false);
    }
    const foreign = await proxyRemcardRequest({
      ...input, origin: "https://foreign.example",
      bodyText: JSON.stringify({ kind: "TERMS", legalDocumentId: "new-doc" }),
    });
    assert.equal(foreign.status, 403);
  });

  it("preserves document binding and forwards a version mismatch without retry", async () => {
    const input = {
      method: "POST", pathname: "/api/account/consent", search: "",
      contentType: "application/json", cookieHeader: "remcard-token=synthetic",
      origin: "http://localhost:3000",
    };
    for (const [legalDocumentId, expectedStatus] of [["new-doc", 200], ["old-doc", 409]] as const) {
      const res = await proxyRemcardRequest({
        ...input, bodyText: JSON.stringify({ kind: "TERMS", legalDocumentId }),
      });
      assert.equal(res.status, expectedStatus);
      const body = await buildProxyNextResponse(res).json();
      if (expectedStatus === 200) assert.equal(body.legalDocumentId, legalDocumentId);
      else assert.equal(body.error, "DOCUMENT_VERSION_MISMATCH");
    }
  });

  it("normalizes paths and rejects traversal", () => {
    assert.equal(normalizeProxyPath(["api", "auth", "me"]), "/api/auth/me");
    assert.equal(normalizeProxyPath(["api", "..", "auth", "me"]), null);
    assert.equal(normalizeProxyPath(["api", "auth", "me%2Fevil"]), null);
  });

  it("allows only verified route/method pairs", () => {
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/me"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/auth/me"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/auth/verify-code"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/account/consent"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/account/cabinet-readiness"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/account/consent"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/verify-code"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/logout"), false);
    assert.equal(isAllowedProxyRoute("POST", "/api/auth/logout"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/auth/logout-all-sessions"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/auth/logout-all-sessions"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/certificate/issue"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/certificate/available-partners"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/store/certificate/clxyz1234567890123456789"),
      true,
    );
    assert.equal(isAllowedProxyRoute("POST", "/api/store/certificate"), true);
    assert.equal(isAllowedProxyRoute("DELETE", "/api/auth/me"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/partners/partner-1/partnerships"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/partners/partner-1/partnerships"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/partners/partner-1/partnerships/extra"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/access/users"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/access/users"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/access/users/admin-2/revoke"), true);
    assert.equal(isAllowedProxyRoute("DELETE", "/api/pro/admin/access/users/admin-2/revoke"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/access/users/admin-2/revoke"), false);
    // A17a: exact GET /api/admin/team only — no wildcard, search, or writes.
    assert.equal(isAllowedProxyRoute("GET", "/api/admin/team"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/admin/team"), false);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/admin/team"), false);
    assert.equal(isAllowedProxyRoute("DELETE", "/api/admin/team"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/admin/team/search"), false);
    assert.equal(isAllowedProxyRoute("POST", "/api/admin/team/search"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/admin/team/extra"), false);
    // A21a: exact GET /api/admin/users allowed; writes and /users/:id stay denied.
    assert.equal(isAllowedProxyRoute("GET", "/api/admin/users"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/admin/users"), false);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/admin/users/u1"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/admin/users/u1"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/admin"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/access/audit"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/access/audit/extra"), false);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/access/audit"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/notification-settings"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/pro/admin/notification-settings"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/notification-bind/status"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/notification-bind/start"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/notification-bind/start"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/notification-bind/start/extra"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/notifications/unread-count"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/notifications"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/pro/admin/notifications/n1/read"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/admin/notifications/mark-all-read"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/admin/notifications/extra"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/partner-taxonomy"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/partner-type/switch"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/partner-type/switch"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/geocode/resolve"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/partnership/incoming-count"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/partnership/remind"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/partnership/part-123"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/limits/org"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/limits/org"), true);
    assert.equal(isAllowedProxyRoute("DELETE", "/api/pro/limits/org"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/partner/user-abc/certificate-program-summary"),
      true,
    );
    assert.equal(isAllowedProxyRoute("GET", "/api/partnerships/part-123/term-change"), true);
    assert.equal(
      isAllowedProxyRoute("POST", "/api/partnerships/part-123/term-change/req-1/respond"),
      true,
    );
    assert.equal(isAllowedProxyRoute("PATCH", "/api/partnerships/part-123"), false);
    assert.equal(isAllowedProxyRoute("POST", "/api/store/order/preview"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/store/order"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/order"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/bonus-list"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/store/orders"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/store/orders/cabcdefghijklmnopqrst"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute(
        "PATCH",
        "/api/store/orders/cabcdefghijklmnopqrst/receiving-client",
      ),
      true,
    );
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/orders"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/orders/cabcdefghijklmnopqrst"),
      true,
    );
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/wallet/balance"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/wallet/transactions"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/wallet/settlements"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/r05/status"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/wallet/agent-receivables/overview"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/wallet/agent-receivables/partners"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/wallet/agent-receivables/orders/cabcdefghijklmnopqrst"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/wallet/agent-receivables/export"),
      true,
    );
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/cabinet-ui-preferences"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/pro/cabinet-ui-preferences"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/organization/permission-templates"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/organization/permission-templates"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/bonus/clxyz123456789012345678/pay"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("GET", "/api/bonus/clxyz123456789012345678/payout-actions"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("PATCH", "/api/pro/organization/branches/br_krd_partizan"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/organization/branches/cabcdefghijklmnopqrst"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/organization/branches/br_krd/submit-for-moderation"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/employees"),
      isAllowedProxyRoute("PATCH", "/api/pro/organization/branches/br_krd/employees/emp_1"),
      true,
    );
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/organization/branches/../auth/me"), false);
    assert.equal(isAllowedProxyRoute("POST", "/api/partnership/discussion-invite"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/partnership/discussion-invite"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/partnership/discussion-invite/disc-invite-1"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("DELETE", "/api/partnership/discussion-invite/disc-invite-1"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("GET", "/api/partnership/discussion-invite/public/tok-abc"),
      true,
    );
    assert.equal(isAllowedProxyRoute("POST", "/api/partnership/discussion-invite/join"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/partnership/discussion-invite/join"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/referred-appeals"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/referred-appeals/appeal_1"), true);
    assert.equal(
      isAllowedProxyRoute("GET", "/api/pro/referred-appeals/by-partner/branch_1"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("PATCH", "/api/pro/referred-appeals/appeal_1/personal-meta"),
      true,
    );
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/referred-appeals/personal-batch"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals"), true);
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/client-appeals"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals/appeal_1"), true);
    assert.equal(
      isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/appeal_1/stage"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/client-appeals/appeal_1/order-link"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/client-appeals/batch/order-link"),
      false,
    );
    assert.equal(isAllowedProxyRoute("POST", "/api/pro/client-appeals/batch"), true);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals/working-stages"), true);
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/client-appeals/certificate-entry"),
      true,
    );
    assert.equal(
      isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/appeal_1/personal-overlay"),
      false,
    );
    assert.equal(
      isAllowedProxyRoute("POST", "/api/pro/client-appeals/personal-overlay/batch"),
      false,
    );
    assert.equal(isAllowedProxyRoute("PATCH", "/api/pro/client-appeals/appeal_1"), true);
    assert.equal(isAllowedProxyRoute("PATCH", "/api/pro/referred-appeals/appeal_1"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/referred-appeals/personal-batch"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/client-appeals/batch"), false);
    assert.equal(isAllowedProxyRoute("GET", "/api/pro/referred-appeals/by-partner"), false);
    assert.equal(normalizeProxyPath(["api", "pro", "organization", "branches", "..", "auth"]), null);
  });

  it("forwards only allowlisted cookies", () => {
    assert.equal(
      filterAllowedCookies("remcard-token=abc; other=secret; remcard-token=def"),
      "remcard-token=abc; remcard-token=def",
    );
    assert.equal(filterAllowedCookies("other=secret"), null);
    assert.equal(filterAllowedCookies("oauth_vk_state=abc; remcard-token=abc"), "remcard-token=abc");
    assert.equal(
      filterAllowedCookies("remcard-token=abc; remcard-pro-branch=br_1; evil=1"),
      "remcard-token=abc; remcard-pro-branch=br_1",
    );
    const consent = encodeURIComponent(JSON.stringify({ analytics: true }));
    assert.equal(
      filterAllowedCookies(
        `remcard-token=abc; cookie-consent=${consent}; unrelated-private-cookie=must-not-leak`,
        new Set(["cookie-consent"]),
      ),
      `remcard-token=abc; cookie-consent=${consent}`,
    );
  });

  it("rejects missing or foreign origins for mutating requests", () => {
    const prev = process.env.REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN;
    delete process.env.REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN;
    assert.equal(isAllowedMutatingOrigin(null), false);
    assert.equal(isAllowedMutatingOrigin("http://evil.example"), false);
    assert.equal(isAllowedMutatingOrigin("http://localhost:3000"), true);
    assert.equal(isAllowedMutatingOrigin("http://127.0.0.1:3048"), false);
    process.env.REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN = "1";
    assert.equal(isAllowedMutatingOrigin("http://127.0.0.1:3048"), false);
    if (prev === undefined) delete process.env.REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN;
    else process.env.REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN = prev;
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
      "remcard-pro-branch=br_a; Path=/; HttpOnly",
      "unexpected_cookie=evil; Path=/; HttpOnly",
      "remcard-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]);
    assert.equal(filtered.length, 3);
    assert.ok(filtered.some((c) => c.startsWith("remcard-token=abc")));
    assert.ok(filtered.some((c) => c.startsWith("remcard-pro-branch=br_a")));
    assert.ok(filtered.some((c) => /Expires=Thu, 01 Jan 1970/.test(c)));
  });

  it("buildProxyNextResponse never forwards disallowed Set-Cookie headers", () => {
    const response = buildProxyNextResponse({
      ok: true,
      status: 200,
      body: new TextEncoder().encode("{}").buffer,
      contentType: "application/json",
      setCookies: ["unexpected_cookie=value; Path=/; HttpOnly"],
      location: null,
      idempotentReplayed: null,
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

  it("forwards analytics consent cookie only for session-visit upstream", async () => {
    const consent = encodeURIComponent(JSON.stringify({ analytics: true }));
    const result = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/pro/activity/session-visit",
      search: "",
      contentType: "application/json",
      cookieHeader: `remcard-token=abc; cookie-consent=${consent}; unrelated-private-cookie=must-not-leak`,
      bodyText: "{}",
      origin: "http://localhost:3000",
    });
    assert.equal(result.ok, true);
    assert.match(stubState.lastCookie ?? "", /cookie-consent=/);
    assert.doesNotMatch(stubState.lastCookie ?? "", /unrelated-private-cookie/);
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

  it("passes every reward action and exact retry through the real BFF request builder", async () => {
    const segments = ["api", "pro", "wallet", "order-rewards", "caaaaaaaaaaaaaaaaaaaaaaaa"];
    const actions = [
      { type: "fulfill", lineId: "doors", fulfilledAt: "2026-11-02T12:00:00.000Z" },
      { type: "return", lineId: "doors", grossKopecks: 10000 },
      { type: "suspend", lineId: "doors", kopecks: 1000 },
      { type: "resume", lineId: "doors" },
      { type: "propose_payment", method: "TRANSFER", kopecks: 1000 },
      { type: "confirm_payment", paymentId: "owned-payment" },
      { type: "reject_payment", paymentId: "owned-payment" },
    ];
    for (const action of actions) {
      const key = `reward-boundary-${action.type}`;
      const body = JSON.stringify(action);
      for (let attempt = 0; attempt < 2; attempt++) {
        const request = new NextRequest(`http://localhost:3000/api/remcard/${segments.join("/")}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
            Cookie: "remcard-token=abc; remcard-csrf=qa-csrf",
            "X-CSRF-Token": "qa-csrf",
            "Idempotency-Key": key,
          },
          body,
        });
        const input = await buildRemcardProxyRequestInput(request, segments);
        assert.ok(input);
        assert.equal(input.idempotencyKeyHeader, key, `${action.type}: builder preserves key`);
        const result = await proxyRemcardRequest(input);
        assert.equal(result.ok, true);
        assert.equal(result.status, 200);
        assert.equal(stubState.lastIdempotencyKey, key);
        assert.equal(stubState.lastRewardBody, body);
      }
    }
  });

  it("does not manufacture or leak reward idempotency keys to unrelated BFF requests", async () => {
    const paths = [
      { method: "GET", segments: ["api", "pro", "wallet", "order-rewards", "caaaaaaaaaaaaaaaaaaaaaaaa"] },
      { method: "POST", segments: ["api", "account", "consent"] },
      { method: "POST", segments: ["api", "pro", "wallet", "order-rewards", "invalid-id"] },
    ];
    for (const { method, segments } of paths) {
      const request = new NextRequest(`http://localhost:3000/api/remcard/${segments.join("/")}`, {
        method, headers: { "Idempotency-Key": "must-not-leak" },
      });
      const input = await buildRemcardProxyRequestInput(request, segments);
      assert.ok(input);
      assert.equal(input.idempotencyKeyHeader, null);
    }
    const missing = await buildRemcardProxyRequestInput(new NextRequest("http://localhost:3000/api/remcard/api/pro/wallet/order-rewards/caaaaaaaaaaaaaaaaaaaaaaaa", { method: "POST" }),
      ["api", "pro", "wallet", "order-rewards", "caaaaaaaaaaaaaaaaaaaaaaaa"]);
    assert.ok(missing);
    assert.equal(missing.idempotencyKeyHeader, null);
  });

  it("allows only scoped reward GET/POST and forwards the exact financial idempotency key", async () => {
    const pathname = "/api/pro/wallet/order-rewards/caaaaaaaaaaaaaaaaaaaaaaaa";
    for (const method of ["GET", "POST"]) {
      const result = await proxyRemcardRequest({ method, pathname, search: "",
        contentType: "application/json", cookieHeader: "remcard-token=abc",
        origin: "http://localhost:3000", bodyText: method === "POST" ? '{"type":"fulfill"}' : null,
        csrfHeader: "qa-csrf", idempotencyKeyHeader: method === "POST" ? "reward-exact-key" : null });
      assert.equal(result.ok, true);
      if (method === "POST") assert.equal(stubState.lastIdempotencyKey, "reward-exact-key");
    }
    const denied = await proxyRemcardRequest({ method: "DELETE", pathname, search: "",
      contentType: "application/json", cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000", bodyText: null, csrfHeader: null });
    assert.equal(denied.ok, false);
  });

  it("requires Idempotency-Key for POST /api/store/order and forwards valid keys", async () => {
    const missing = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/store/order",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ certificateCode: "RC-X", items: [] }),
      idempotencyKeyHeader: null,
    });

    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.equal(missing.status, 400);

    const invalid = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/store/order",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ certificateCode: "RC-X", items: [] }),
      idempotencyKeyHeader: "bad key!",
    });

    assert.equal(invalid.ok, false);
    if (invalid.ok) return;
    assert.equal(invalid.status, 400);

    const ok = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/store/order",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ certificateCode: "RC-X", items: [] }),
      idempotencyKeyHeader: "550e8400-e29b-41d4-a716-446655440000",
    });

    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(stubState.lastIdempotencyKey, "550e8400-e29b-41d4-a716-446655440000");

    const replay = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/store/order",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ certificateCode: "RC-X", items: [] }),
      idempotencyKeyHeader: "replay-key",
    });

    assert.equal(replay.ok, true);
    if (!replay.ok) return;
    assert.equal(replay.idempotentReplayed, "true");

    const clientResponse = buildProxyNextResponse(replay);
    assert.equal(clientResponse.headers.get("Idempotent-Replayed"), "true");
  });

  it("forwards Idempotency-Key only for scoped POST /api/bonus/:id/pay via BFF builder and proxy", async () => {
    const bonusId = "clxyz123456789012345678";
    const payPath = `/api/bonus/${bonusId}/pay`;
    const clientKey = `prof-i-d.${bonusId}.550e8400-e29b-41d4-a716-446655440000`;
    const paySegments = ["api", "bonus", bonusId, "pay"];

    stubState.lastIdempotencyKey = "stale";
    const payRequest = new NextRequest(`http://localhost:3000/api/remcard/${paySegments.join("/")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: "remcard-token=abc; remcard-csrf=qa-csrf",
        "X-CSRF-Token": "qa-csrf",
        "Idempotency-Key": clientKey,
      },
      body: JSON.stringify({ method: "CASH" }),
    });
    const payInput = await buildRemcardProxyRequestInput(payRequest, paySegments);
    assert.ok(payInput);
    assert.equal(payInput.idempotencyKeyHeader, clientKey);
    const payResult = await proxyRemcardRequest(payInput);
    assert.equal(payResult.ok, true);
    assert.equal(stubState.lastIdempotencyKey, clientKey);

    stubState.lastIdempotencyKey = "stale";
    const invalid = await proxyRemcardRequest({
      method: "POST",
      pathname: payPath,
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ method: "CASH" }),
      idempotencyKeyHeader: "bad key!",
    });
    assert.equal(invalid.ok, false);
    if (invalid.ok) return;
    assert.equal(invalid.status, 400);
    assert.equal(stubState.lastIdempotencyKey, "stale");

    stubState.lastIdempotencyKey = "stale";
    const missingKeyInput = await buildRemcardProxyRequestInput(
      new NextRequest(`http://localhost:3000/api/remcard/${paySegments.join("/")}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ method: "CASH" }),
      }),
      paySegments,
    );
    assert.ok(missingKeyInput);
    assert.equal(missingKeyInput.idempotencyKeyHeader, null);
    const missingKeyResult = await proxyRemcardRequest(missingKeyInput);
    assert.equal(missingKeyResult.ok, true);
    assert.equal(stubState.lastIdempotencyKey, null);

    const actionsSegments = ["api", "bonus", bonusId, "payout-actions"];
    stubState.lastIdempotencyKey = "stale";
    const actionsInput = await buildRemcardProxyRequestInput(
      new NextRequest(`http://localhost:3000/api/remcard/${actionsSegments.join("/")}`, {
        method: "GET",
        headers: { "Idempotency-Key": "must-not-leak" },
      }),
      actionsSegments,
    );
    assert.ok(actionsInput);
    assert.equal(actionsInput.idempotencyKeyHeader, null);
    await proxyRemcardRequest(actionsInput);
    assert.equal(stubState.lastIdempotencyKey, null);

    const consentInput = await buildRemcardProxyRequestInput(
      new NextRequest("http://localhost:3000/api/remcard/api/account/consent", {
        method: "POST",
        headers: { "Idempotency-Key": "must-not-leak" },
        body: JSON.stringify({ legalDocumentId: "doc-1" }),
      }),
      ["api", "account", "consent"],
    );
    assert.ok(consentInput);
    assert.equal(consentInput.idempotencyKeyHeader, null);

    const storeKey = "550e8400-e29b-41d4-a716-446655440000";
    stubState.lastIdempotencyKey = null;
    const storeResult = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/store/order",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ certificateCode: "RC-X", items: [] }),
      idempotencyKeyHeader: storeKey,
    });
    assert.equal(storeResult.ok, true);
    assert.equal(stubState.lastIdempotencyKey, storeKey);

    stubState.lastIdempotencyKey = null;
    const rewardResult = await proxyRemcardRequest({
      method: "POST",
      pathname: "/api/pro/wallet/order-rewards/caaaaaaaaaaaaaaaaaaaaaaaa",
      search: "",
      contentType: "application/json",
      cookieHeader: "remcard-token=abc",
      origin: "http://localhost:3000",
      bodyText: JSON.stringify({ type: "fulfill", lineId: "doors" }),
      csrfHeader: "qa-csrf",
      idempotencyKeyHeader: "reward-exact-key",
    });
    assert.equal(rewardResult.ok, true);
    assert.equal(stubState.lastIdempotencyKey, "reward-exact-key");
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
