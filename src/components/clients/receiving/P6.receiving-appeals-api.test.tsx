import { describe, expect, it } from "vitest";
import {
  fetchReceivingAppealsWorkspace,
  buildReceivingAppealsListQuery,
  coerceK1ClientAppealsListPayload,
  mapReceivingAppealListRowFromWire,
  toK1ReceivingAppealCreateBody,
  receivingAppealsMutationsAllowed,
  findActiveReceivingAppeal,
  findDuplicateManualChannelLabel,
  isReceivingAppealActive,
  isReceivingAppealsProxyReady,
  isReceivingBatchProxyReady,
  isReceivingCertificateEntryProxyReady,
  postReceivingAppealsBatch,
  isReceivingSettingsMaterialized,
  mapReceivingAppealDetailFieldsFromWire,
  postReceivingManualChannel,
  postReceivingWorkingStagesMutation,
  receivingManualChannelOptions,
  submitReceivingCertificateEntry,
  RECEIVING_SYSTEM_STAGE,
  type ReceivingAppealListRow,
} from "@/lib/clients-parity/receiving-appeals-api";

const baseRow = (overrides: Partial<ReceivingAppealListRow>): ReceivingAppealListRow => ({
  id: "x",
  clientName: "c",
  certificateId: "CERT-1",
  receivingPartnerUserId: "user-17",
  receivingPartnerId: "user-17",
  referrerPartnerId: "ref",
  interest: "—",
  stageId: RECEIVING_SYSTEM_STAGE.NEW,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("P6.receiving-appeals-api contract gate", () => {
  it("isActiveAppeal matches prototype (refused/return only)", () => {
    expect(isReceivingAppealActive(baseRow({ stageId: "ws_measure" }))).toBe(true);
    expect(isReceivingAppealActive(baseRow({ stageId: RECEIVING_SYSTEM_STAGE.REFUSED }))).toBe(
      false,
    );
    expect(
      isReceivingAppealActive(
        baseRow({ stageId: "ws_measure", bucket: "archive" }),
      ),
    ).toBe(true);
  });

  it("maps K8/K1 wire fields to UI row", () => {
    const ui = mapReceivingAppealListRowFromWire({
      id: "a1",
      clientDisplayName: "Иван",
      stageKey: "sys_new",
      originKind: "manual",
      manualSourceKey: "phone",
      purchaseOrderId: "ord-9",
      certificateId: "CERT",
      receivingPartnerUserId: "u1",
      referrerPartnerId: "r1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
    expect(ui.clientName).toBe("Иван");
    expect(ui.stageId).toBe("sys_new");
    expect(ui.manualEntry).toBe(true);
    expect(ui.manualSourceKey).toBe("phone");
    expect(ui.purchaseId).toBe("ord-9");
  });

  it("maps manual create body to K1 POST field names", () => {
    expect(
      toK1ReceivingAppealCreateBody({
        clientName: "ООО Ромашка",
        manualSourceKey: "visit",
      }),
    ).toEqual({
      clientDisplayName: "ООО Ромашка",
      manualSourceKey: "visit",
    });
  });

  it("coerceK1 83f279e8 wire uses readOnly, not invented write access", () => {
    const row = baseRow({ receivingPartnerUserId: "", receivingPartnerId: "only-alias" });
    const out = coerceK1ClientAppealsListPayload({
      appeals: [
        {
          id: row.id,
          clientDisplayName: row.clientName,
          stageKey: row.stageId,
          certificateId: row.certificateId,
          receivingPartnerUserId: "only-alias",
          receivingPartnerId: "only-alias",
          referrerPartnerId: row.referrerPartnerId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      ],
      nextCursor: "c2",
      tab: "active",
      readOnly: false,
    });
    expect(out.readOnly).toBe(false);
    expect(receivingAppealsMutationsAllowed(out)).toBe(true);
    expect(out.kpis).toBeUndefined();
    expect(out.appeals[0]?.receivingPartnerUserId).toBe("only-alias");

    const ro = coerceK1ClientAppealsListPayload({ appeals: [], readOnly: true });
    expect(receivingAppealsMutationsAllowed(ro)).toBe(false);
  });

  it("buildReceivingAppealsListQuery uses bucket and maps stage label to stageKey", () => {
    expect(
      buildReceivingAppealsListQuery(
        {
          q: "иван",
          bucket: "archive",
          source: "cert",
          status: "Замер",
        },
        null,
        { workingStages: [{ id: "ws_measure", label: "Замер" }], refusalReasons: [], archivedStages: [] },
      ),
    ).toBe("?bucket=archive&source=cert&q=%D0%B8%D0%B2%D0%B0%D0%BD&stage=ws_measure");
  });

  it("maps paidAmountKopecks to display rubles", () => {
    const ui = mapReceivingAppealListRowFromWire({
      id: "p",
      clientDisplayName: "x",
      receivingPartnerUserId: "u",
      stageKey: "sys_new",
      paidAmountKopecks: 12345,
      referrerProUserId: "ref",
      originKind: "certificate",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(ui.paidAmountKopecks).toBe(12345);
    expect(ui.referrerPartnerId).toBe("ref");
    expect(ui.sourceKey).toBe("certificate");
  });

  it("findActiveReceivingAppeal scopes by receiving User.id", () => {
    const appeals = [
      baseRow({ id: "a1", certificateId: "C-9" }),
      baseRow({
        id: "a2",
        certificateId: "C-9",
        receivingPartnerUserId: "other-user",
        receivingPartnerId: "other-user",
        stageId: RECEIVING_SYSTEM_STAGE.REFUSED,
      }),
    ];
    expect(findActiveReceivingAppeal(appeals, "C-9", "user-17")?.id).toBe("a1");
    expect(findActiveReceivingAppeal(appeals, "C-9", "missing")).toBeUndefined();
  });
  it("empty settings are not materialized until K8 persistence", () => {
    expect(
      isReceivingSettingsMaterialized({
        workingStages: [],
        refusalReasons: [],
        archivedStages: [],
      }),
    ).toBe(false);
  });

  it("certificate-entry proxy not ready — blocked without fake success", async () => {
    expect(isReceivingCertificateEntryProxyReady()).toBe(false);
    const res = await submitReceivingCertificateEntry({ promoCode: "RC-1" }, { readOnly: false });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("BLOCKED_CONTRACT");
    }
  });

  it("proxy not ready on production pin — blocked without network", async () => {
    expect(isReceivingAppealsProxyReady()).toBe(false);
    const res = await fetchReceivingAppealsWorkspace();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("BLOCKED_CONTRACT");
      expect(res.blockerId).toBe("BLK-RECEIVING-APPEALS");
    }
  });

  it("manual channel duplicate check is case-insensitive (prototype addWorkspaceChannel)", () => {
    const channels = receivingManualChannelOptions({
      workingStages: [],
      refusalReasons: [],
      archivedStages: [],
      manualChannels: [{ key: "ch_1", label: "Instagram" }],
    });
    expect(findDuplicateManualChannelLabel("instagram", channels)?.key).toBe("ch_1");
    expect(findDuplicateManualChannelLabel("Звонок", channels)?.key).toBe("phone");
    expect(findDuplicateManualChannelLabel("  ", channels)).toBeNull();
  });

  it("detail mapper keeps privateNotes and discount fields", () => {
    const detail = mapReceivingAppealDetailFieldsFromWire({
      id: "d1",
      clientDisplayName: "Клиент",
      stageKey: "sys_new",
      receivingPartnerUserId: "u1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      privateNotes: "  заметка  ",
      clientContact: "+7",
      discountPercent: 12,
      certValidUntil: "2027-01-01",
    });
    expect(detail.privateNotes).toBe("заметка");
    expect(detail.clientContact).toBe("+7");
    expect(detail.discountPercent).toBe(12);
    expect(detail.certValidUntil).toBe("2027-01-01");
  });

  it("postReceivingManualChannel blocked when working-stages POST not on proxy pin", async () => {
    const res = await postReceivingManualChannel("Новый канал", 1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("BLOCKED_CONTRACT");
    }
  });

  it("postReceivingAppealsBatch blocked without P1 batch allowlist", async () => {
    expect(isReceivingBatchProxyReady()).toBe(false);
    const res = await postReceivingAppealsBatch({ action: "archive", ids: ["a1"] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("BLOCKED_CONTRACT");
  });

  it("postReceivingWorkingStagesMutation blocked without P1 allowlist", async () => {
    const res = await postReceivingWorkingStagesMutation({
      kind: "addWorkingStage",
      label: "Замер",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("BLOCKED_CONTRACT");
  });
});
