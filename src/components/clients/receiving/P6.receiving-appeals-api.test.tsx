import { describe, expect, it } from "vitest";
import {
  fetchReceivingAppealsWorkspace,
  coerceK1ClientAppealsListPayload,
  coerceReceivingAppealListRow,
  findActiveReceivingAppeal,
  isReceivingAppealActive,
  isReceivingAppealsProxyReady,
  isReceivingCertificateEntryProxyReady,
  isReceivingSettingsMaterialized,
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

  it("coerceK1 payload unwraps data and fills receivingPartnerUserId", () => {
    const row = baseRow({ receivingPartnerUserId: "", receivingPartnerId: "only-alias" });
    const out = coerceK1ClientAppealsListPayload({
      data: {
        appeals: [row],
        kpis: { inWork: 1, paid: 0, shipped: 0, conv: "0%" },
        settings: { workingStages: [], refusalReasons: [], archivedStages: [] },
        access: { listAllowed: true, mutationsAllowed: true },
        principal: {
          receivingPartnerUserId: "session-user",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
    });
    expect(out.principal.receivingPartnerUserId).toBe("session-user");
    expect(coerceReceivingAppealListRow(row).receivingPartnerUserId).toBe("only-alias");
    expect(out.appeals[0]?.receivingPartnerUserId).toBe("only-alias");
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
    const res = await submitReceivingCertificateEntry({ certificateCode: "RC-1" }, {
      listAllowed: true,
      mutationsAllowed: true,
    });
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
});
