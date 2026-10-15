import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAgentRequisites,
  enableR02AgentActivity,
  finishAgentProfile,
  patchAgentProfileDraft,
  patchAgentRequisites,
} from "./api";

describe("agent-profile api client bodies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends JSON objects once through remcardFetch (not double-stringified)", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(typeof init?.body).toBe("string");
      const parsed = JSON.parse(String(init?.body));
      expect(typeof parsed).toBe("object");
      expect(parsed).not.toBeNull();
      return new Response(JSON.stringify({ ok: true, version: 2, draftEpoch: 0, payload: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await patchAgentProfileDraft({
      expectedVersion: 1,
      expectedEpoch: 0,
      mode: "advance",
      fromStep: 1,
      step: 2,
      payload: { displayName: "Alex", city: "Krasnodar" },
    });

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(firstBody.payload.displayName).toBe("Alex");

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, profileComplete: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await finishAgentProfile({ expectedVersion: 2, expectedEpoch: 0 });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).expectedVersion).toBe(2);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user: { partnerActivities: ["AGENT"] } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await enableR02AgentActivity();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({});

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ item: { id: "x" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await createAgentRequisites({ kind: "person", legalName: "Test", inn: "1234567890" });
    const createBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(createBody.legalName).toBe("Test");

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ item: { id: "y" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await patchAgentRequisites("set1", { action: "setPrimary" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).action).toBe("setPrimary");
  });
});
