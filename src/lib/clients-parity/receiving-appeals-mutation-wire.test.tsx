import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { patchReceivingAppealStageCas, postReceivingWorkingStagesMutation } from "./receiving-appeals-api";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);

beforeEach(() => { api.mockReset(); });

describe("Receiving appeal mutation contract", () => {
  it("sends a custom refusal reason in the server's format", async () => {
    api.mockResolvedValueOnce({ settings: { version: 2, refusalReasons: ["Другая причина"] } });
    const result = await postReceivingWorkingStagesMutation({
      kind: "addRefusalReason", label: "Другая причина", expectedVersion: 1,
    });
    expect(api).toHaveBeenCalledWith("/api/pro/client-appeals/working-stages", {
      method: "POST", body: { kind: "refusalReason", reason: "Другая причина", expectedVersion: 1 },
    });
    expect(result).toMatchObject({ ok: true, snapshot: { settings: { refusalReasons: ["Другая причина"] } } });
  });

  it("returns the committed stage revision for the sibling profile editor", async () => {
    api.mockResolvedValueOnce({ revision: 1001, appeal: { stageKey: "sys_refused" } });
    const result = await patchReceivingAppealStageCas("ap-1", {
      stageKey: "sys_refused", refusedReason: "Другая причина", expectedRevision: 1000,
    });
    expect(api).toHaveBeenCalledWith("/api/pro/client-appeals/ap-1/stage", {
      method: "PATCH", body: { stageKey: "sys_refused", refusedReason: "Другая причина", expectedRevision: 1000 },
    });
    expect(result).toEqual({ ok: true, revision: 1001 });
  });
});
