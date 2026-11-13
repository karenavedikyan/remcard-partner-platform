import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: () => true,
}));

import { patchReceivingAppealProfileCas } from "@/lib/clients-parity/receiving-appeals-api";

describe("P6.receiving-appeals-api remcardFetch wire body", () => {
  const originalFetch = globalThis.fetch;
  let wireBody: string | undefined;

  beforeEach(() => {
    wireBody = undefined;
    globalThis.fetch = vi.fn(async (_input, init) => {
      wireBody = typeof init?.body === "string" ? init.body : undefined;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("PATCH profile sends one JSON object (not double-stringified)", async () => {
    const patchBody = { privateNotes: "B", expectedRevision: 2 };
    const result = await patchReceivingAppealProfileCas("ap_1", patchBody);
    expect(result.ok).toBe(true);
    expect(wireBody).toBeDefined();
    const parsed: unknown = JSON.parse(wireBody!);
    expect(typeof parsed).toBe("object");
    expect(parsed).not.toBeNull();
    expect(parsed).toEqual(patchBody);
    expect(typeof (parsed as { privateNotes?: unknown }).privateNotes).toBe("string");
    expect((parsed as { privateNotes: string }).privateNotes).not.toMatch(/^\{/);
  });
});
