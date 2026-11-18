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
