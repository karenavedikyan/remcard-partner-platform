import { describe, expect, it, vi } from "vitest";
import {
  buildReceivingAppealsListQuery,
  coerceK1ClientAppealsListPayload,
  receivingReadScopeParams,
  type ReceivingListFilters,
} from "./receiving-appeals-api";
import { applyReceivingBulkEditsPerId } from "./receiving-bulk-apply";
import {
  receivingBranchLabel,
  receivingBranchLabelById,
  receivingBranchScopeOf,
  resolveReceivingBranchSelection,
} from "@/components/clients/receiving/receiving-branch-scope";

const base: ReceivingListFilters = { q: "", status: "Все статусы", source: "all", bucket: "active" };
const A = { id: "a", name: "Филиал А", city: "Город", address: "ул. 1" };
const B = { id: "b", name: "Филиал Б", city: "Город", address: null };

describe("explicit read scope in requests", () => {
  it("absence of a choice sends nothing; all sends branchScope=all; a branch sends branchId only", () => {
    expect(buildReceivingAppealsListQuery(base)).toBe("?bucket=active");
    expect(buildReceivingAppealsListQuery({ ...base, branchScope: "all" })).toBe("?bucket=active&branchScope=all");
    expect(buildReceivingAppealsListQuery({ ...base, branchId: "b" })).toBe("?bucket=active&branchId=b");
    expect(buildReceivingAppealsListQuery({ ...base, branchId: "b", branchScope: "all" })).toBe(
      "?bucket=active&branchId=b",
    );
    expect(buildReceivingAppealsListQuery({ ...base, branchId: "  ", branchScope: "all" })).toContain("branchScope=all");
  });

  it("keeps the scope when the cursor and the other filters change", () => {
    const qs = buildReceivingAppealsListQuery({ ...base, q: "x", bucket: "archive", branchScope: "all" }, "cur");
    expect(qs).toContain("branchScope=all");
    expect(qs).toContain("cursor=cur");
    expect(qs).toContain("bucket=archive");
  });

  it("read scope params for detail/funnel never combine branch and all", () => {
    expect(receivingReadScopeParams(null).toString()).toBe("");
    expect(receivingReadScopeParams({ branchScope: "all" }).toString()).toBe("branchScope=all");
    expect(receivingReadScopeParams({ branchId: "b", branchScope: "all" }).toString()).toBe("branchId=b");
  });

  it("p149 bulk CRM PATCH uses fresh revision and changed fields only", async () => {
    const P149_ROW = {
      id: "a1",
      appealTitle: "T",
      clientDisplayName: "Клиент",
      requestText: "Q",
      stageKey: "ws_work",
      stageLabel: "В работе",
      certificatePromoCode: null,
      erpDocumentNumber: null,
      externalRefs: [],
      manualSourceKey: "phone",
      manualSourceLabel: "Звонок",
      responsible: null,
      receivingBranchId: "b1",
      originKind: "MANUAL" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      remCard: { inCabinet: true },
      capabilities: { canManageLeads: true, canScan: true },
      p149Capabilities: {
        canSelectForBulkWrite: true,
        canPrepareCommercialProposal: true,
        canSendCommercialProposal: false,
      },
    };
    const wire = (revision: number) => ({
      revision,
      appeal: { ...P149_ROW, clientCity: "Москва", budgetHint: null, clientContact: null, privateNotes: "" },
      history: [],
      workingStages: [],
      refusalReasons: [],
      capabilities: { canManageLeads: true, canScan: true },
    });
    const fetchDetail = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, wire: wire(3) })
      .mockResolvedValueOnce({ ok: true, wire: wire(3) })
      .mockResolvedValueOnce({ ok: true, wire: wire(4) });
    const patchProfile = vi.fn().mockResolvedValue({ ok: true, revision: 4 });
    const patchStage = vi.fn();
    const { outcomes, result } = await applyReceivingBulkEditsPerId(
      ["a1"],
      { stageId: "", serviceNote: "", appendNote: true, prof: { clientCity: "Казань" } },
      { appeals: [{ id: "a1", stageId: "ws_work" } as never], workingStages: [], stageBlocked: false },
      { fetchDetail, patchStage, patchProfile },
    );
    expect(outcomes[0]?.ok).toBe(true);
    expect(patchProfile).toHaveBeenCalledWith("a1", { expectedRevision: 3, clientCity: "Казань" });
    expect(fetchDetail).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.updatedIds).toEqual(["a1"]);
  });

  it("p149 bulk CRM PATCH reports failure when refresh after PATCH fails", async () => {
    const P149_ROW = {
      id: "a1",
      appealTitle: "T",
      clientDisplayName: "Клиент",
      requestText: "Q",
      stageKey: "ws_work",
      stageLabel: "В работе",
      certificatePromoCode: null,
      erpDocumentNumber: null,
      externalRefs: [],
      manualSourceKey: "phone",
      manualSourceLabel: "Звонок",
      responsible: null,
      receivingBranchId: "b1",
      originKind: "MANUAL" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      remCard: { inCabinet: true },
      capabilities: { canManageLeads: true, canScan: true },
      p149Capabilities: {
        canSelectForBulkWrite: true,
        canPrepareCommercialProposal: true,
        canSendCommercialProposal: false,
      },
    };
    const wire = (revision: number) => ({
      revision,
      appeal: { ...P149_ROW, clientCity: "Москва", budgetHint: null, clientContact: null, privateNotes: "" },
      history: [],
      workingStages: [],
      refusalReasons: [],
      capabilities: { canManageLeads: true, canScan: true },
    });
    const fetchDetail = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, wire: wire(3) })
      .mockResolvedValueOnce({ ok: true, wire: wire(3) })
      .mockResolvedValueOnce({ ok: false, code: "ERROR", message: "Сеть" });
    const patchProfile = vi.fn().mockResolvedValue({ ok: true, revision: 4 });
    const { outcomes, result } = await applyReceivingBulkEditsPerId(
      ["a1"],
      { stageId: "", serviceNote: "", appendNote: true, prof: { clientCity: "Казань" } },
      { appeals: [{ id: "a1", stageId: "ws_work" } as never], workingStages: [], stageBlocked: false },
      { fetchDetail, patchStage: vi.fn(), patchProfile },
    );
    expect(patchProfile).toHaveBeenCalledTimes(1);
    expect(outcomes[0]?.ok).toBe(false);
    expect(outcomes[0]?.message).toContain("перечитать");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures?.map((f) => f.id)).toEqual(["a1"]);
    }
  });

  it("bulk edit reads the card with the list scope but patches without it", async () => {
    const fetchDetail = vi.fn().mockResolvedValue({ ok: false, code: "ERROR", message: "x" });
    await applyReceivingBulkEditsPerId(
      ["b1"],
      { stageId: "", serviceNote: "заметка", appendNote: false },
      { appeals: [], workingStages: [], stageBlocked: false, readScope: { branchScope: "all" } },
      { fetchDetail, patchStage: vi.fn(), patchProfile: vi.fn() },
    );
    expect(fetchDetail).toHaveBeenCalledWith("b1", { branchScope: "all" });
  });
});

describe("branch selection shown by the control", () => {
  it("scope kinds", () => {
    expect(receivingBranchScopeOf(base)).toBe("default");
    expect(receivingBranchScopeOf({ branchScope: "all" })).toBe("all");
    expect(receivingBranchScopeOf({ branchId: "b" })).toBe("branch");
  });

  it("untouched list follows the server branch, else all; unknown branches fall back to all", () => {
    expect(resolveReceivingBranchSelection(base, [A, B], "a")).toEqual({ kind: "branch", branchId: "a" });
    expect(resolveReceivingBranchSelection(base, [A, B], null)).toEqual({ kind: "all" });
    expect(resolveReceivingBranchSelection(base, [A, B], "foreign")).toEqual({ kind: "all" });
    expect(resolveReceivingBranchSelection({ branchScope: "all" }, [A, B], "a")).toEqual({ kind: "all" });
    expect(resolveReceivingBranchSelection({ branchId: "b" }, [A, B], "a")).toEqual({ kind: "branch", branchId: "b" });
  });

  it("labels are short unless two branches share a name; unassigned has its own label", () => {
    expect(receivingBranchLabel(A, [A, B])).toBe("Филиал А");
    const twin = { ...B, id: "c", name: "Филиал А", address: "ул. 2" };
    expect(receivingBranchLabel(A, [A, twin])).toBe("Филиал А — ул. 1");
    expect(receivingBranchLabelById(null, [A, B])).toBe("Без филиала");
    expect(receivingBranchLabelById("b", [A, B])).toBe("Филиал Б");
    expect(receivingBranchLabelById("gone", [A, B])).toBeNull();
  });
});

describe("trusted read scope from the list response", () => {
  it("maps branchScope.branches to visibleBranches and drops malformed entries", () => {
    const out = coerceK1ClientAppealsListPayload({
      appeals: [],
      branchScope: { branches: [{ id: "a", name: "Филиал А", city: "Город", address: "ул. 1" }, { id: " ", name: "x", city: "" }] },
    });
    expect(out.visibleBranches).toEqual([{ id: "a", name: "Филиал А", city: "Город", address: "ул. 1" }]);
  });

  it("leaves visibleBranches undefined for owners / older servers", () => {
    expect(coerceK1ClientAppealsListPayload({ appeals: [] }).visibleBranches).toBeUndefined();
  });
});
