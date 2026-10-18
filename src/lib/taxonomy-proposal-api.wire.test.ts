import { afterEach, describe, expect, it, vi } from "vitest";
import { submitTaxonomyProposal } from "./taxonomy-proposal-api";

describe("submitTaxonomyProposal wire body", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a single JSON object (not double-stringified) through remcardFetch", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(typeof init?.body).toBe("string");
      const once = JSON.parse(init!.body as string) as Record<string, unknown>;
      expect(() => JSON.parse(once as unknown as string)).toThrow();
      expect(once).toEqual({
        kind: "SERVICE",
        name: "Реставрация лепнины",
        description: "описание",
      });
      return new Response(JSON.stringify({ ok: true, created: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitTaxonomyProposal({
      kind: "SERVICE",
      name: "Реставрация лепнины",
      description: "описание",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/remcard/api/pro/taxonomy-proposals");
  });
});
