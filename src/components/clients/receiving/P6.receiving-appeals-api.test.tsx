import { describe, expect, it } from "vitest";
import {
  fetchReceivingAppealsWorkspace,
  buildReceivingAppealsListQuery,
  coerceK1ClientAppealsListPayload,
  coerceReceivingAppealListRow,
  receivingAppealsMutationsAllowed,
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

  it("coerceK1 83f279e8 wire uses readOnly, not invented write access", () => {
    const row = baseRow({ receivingPartnerUserId: "", receivingPartnerId: "only-alias" });
    const out = coerceK1ClientAppealsListPayload({
      appeals: [row],
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

  it("buildReceivingAppealsListQuery maps bucket to tab", () => {
    expect(
      buildReceivingAppealsListQuery({
        q: "иван",
        bucket: "archive",
        source: "cert",
        status: "Замер",
      }),
    ).toBe("?tab=archive&source=cert&q=%D0%B8%D0%B2%D0%B0%D0%BD&stage=%D0%97%D0%B0%D0%BC%D0%B5%D1%80");
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
    const res = await submitReceivingCertificateEntry({ certificateCode: "RC-1" }, { readOnly: false });
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
