import { describe, expect, it } from "vitest";
import {
  intersectResponsibleOptions,
  parseProfAppealDetailWire,
  parseResponsibleOptionsWire,
  buildProfProfilePatchBody,
  profBaselineFromDetailState,
  type ReceivingAppealListItemWire,
} from "./prof-appeals-adapter";
import type { ReceivingAppealDetailWire } from "./receiving-appeals-api";
import { responsibleSelectOptions } from "@/components/clients/receiving/ReceivingAppealProfDrawerForm";

const P149_CAPS = {
  canSelectForBulkWrite: true,
  canPrepareCommercialProposal: true,
  canSendCommercialProposal: false,
} as const;

const LIST_ITEM: ReceivingAppealListItemWire = {
  id: "appeal-2408",
  appealTitle: "Отделка",
  clientDisplayName: "Анна",
  requestText: "Двери",
  stageKey: "ws_work",
  stageLabel: "В работе",
  certificatePromoCode: null,
  erpDocumentNumber: null,
  externalRefs: [],
  manualSourceKey: "phone",
  manualSourceLabel: "Звонок",
  responsible: { userId: "u1", displayLabel: "Мария" },
  receivingBranchId: "b1",
  receivingBranchLabel: "Филиал Север",
  createdByLabel: "Иван П.",
  originKind: "MANUAL",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  remCard: { inCabinet: true },
  capabilities: { canManageLeads: true, canScan: true },
  p149Capabilities: { ...P149_CAPS },
};

function detailEnvelope(over: Partial<ReceivingAppealDetailWire> = {}): ReceivingAppealDetailWire {
  return {
    revision: 3,
    appeal: { ...LIST_ITEM, clientCity: "Москва", privateNotes: "", budgetHint: null, clientContact: null },
    history: [],
    workingStages: [],
    refusalReasons: [],
    capabilities: { canManageLeads: true, canScan: true },
    responsibleOptions: [
      { userId: "u1", displayLabel: "Мария" },
      { userId: "u2", displayLabel: "Пётр" },
    ],
    ...over,
  };
}

describe("prof responsible wire", () => {
  it("parseResponsibleOptionsWire drops invalid rows", () => {
    expect(
      parseResponsibleOptionsWire([
        { userId: "a", displayLabel: "A" },
        { userId: "", displayLabel: "X" },
        null,
      ]),
    ).toEqual([{ userId: "a", displayLabel: "A" }]);
  });

  it("intersectResponsibleOptions keeps shared userIds only", () => {
    const a = [
      { userId: "u1", displayLabel: "Мария" },
      { userId: "u2", displayLabel: "Пётр" },
    ];
    const b = [
      { userId: "u1", displayLabel: "Мария" },
      { userId: "u3", displayLabel: "Олег" },
    ];
    expect(intersectResponsibleOptions([a, b])).toEqual([{ userId: "u1", displayLabel: "Мария" }]);
    expect(intersectResponsibleOptions([a])).toEqual(a);
    expect(intersectResponsibleOptions([])).toEqual([]);
  });

  it("parseProfAppealDetailWire exposes responsibleOptions when writable", () => {
    const state = parseProfAppealDetailWire(detailEnvelope());
    expect(state?.responsibleOptions).toHaveLength(2);
    expect(state?.appeal.createdByLabel).toBe("Иван П.");
    expect(state?.appeal.receivingBranchLabel).toBe("Филиал Север");
  });

  it("parseProfAppealDetailWire clears responsibleOptions when read-only", () => {
    const state = parseProfAppealDetailWire(
      detailEnvelope({ readOnly: true, capabilities: { canManageLeads: false, canScan: false } }),
    );
    expect(state?.detailReadOnly).toBe(true);
    expect(state?.responsibleOptions).toEqual([]);
  });

  it("responsibleSelectOptions includes placeholder and current value", () => {
    const opts = responsibleSelectOptions([{ userId: "u2", displayLabel: "Пётр" }], {
      userId: "u9",
      displayLabel: "Гость",
    });
    expect(opts[0]?.label).toBe("Не назначен");
    expect(opts.some((o) => o.value === "u9")).toBe(true);
  });

  it("profile PATCH sends responsibleUserId when draft changes", () => {
    const detail = parseProfAppealDetailWire(detailEnvelope())!;
    const baseline = profBaselineFromDetailState(detail);
    const draft = { ...baseline, responsibleUserId: "u2" };
    const body = buildProfProfilePatchBody(baseline, draft, detail.revision);
    expect(body.responsibleUserId).toBe("u2");
  });
});