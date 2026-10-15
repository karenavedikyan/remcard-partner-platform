import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";

describe("prof-admin-api request bodies", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("adminPasswordLogin sends a single JSON object (not double-stringified)", async () => {
    let capturedBody: unknown;
    global.fetch = mock.fn(async (_input, init) => {
      capturedBody = init?.body;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const { adminPasswordLogin } = await import("./prof-admin-api");
    await adminPasswordLogin("owner@example.com", "secret-password-12");
    assert.equal(typeof capturedBody, "string");
    const parsed = JSON.parse(String(capturedBody));
    assert.equal(typeof parsed, "object");
    assert.notEqual(parsed, null);
    assert.equal(Array.isArray(parsed), false);
    assert.equal(parsed.login, "owner@example.com");
    assert.equal(parsed.password, "secret-password-12");
  });

  it("createProfTestUser preserves kind/name/city object fields", async () => {
    let capturedBody: unknown;
    global.fetch = mock.fn(async (_input, init) => {
      capturedBody = init?.body;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const { createProfTestUser } = await import("./prof-admin-api");
    await createProfTestUser({ displayName: "Тест · Агент", kind: "agent", city: "Краснодар" });
    const parsed = JSON.parse(String(capturedBody));
    assert.equal(parsed.kind, "agent");
    assert.equal(parsed.displayName, "Тест · Агент");
    assert.equal(parsed.city, "Краснодар");
  });
});
