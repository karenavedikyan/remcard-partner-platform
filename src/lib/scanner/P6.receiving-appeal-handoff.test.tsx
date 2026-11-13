import { describe, expect, it, vi } from "vitest";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import {
  loadReceivingAppealScannerContext,
  receivingCertificateMatchesPreview,
} from "./receiving-appeal-handoff";
import type { OrderPreviewAllowed } from "@/lib/order-types";

const preview = {
  allowed: true as const,
  certificate: {
    id: "cert-1",
    promoCode: "RC-1",
    status: "active",
    validUntil: null,
    usageCount: 0,
    maxUsages: 0,
    userAlias: null,
    issuer: { label: "A", name: "B" },
  },
  partner: { id: "p1", storeName: "Store", isSelfScan: false },
  availableCategories: [],
} satisfies OrderPreviewAllowed;

describe("P6.receiving-appeal-handoff", () => {
  it("certificate-bound appeal rejects mismatched preview", () => {
    expect(receivingCertificateMatchesPreview("cert-1", preview)).toBe(true);
    expect(receivingCertificateMatchesPreview("cert-2", preview)).toBe(false);
    expect(receivingCertificateMatchesPreview(null, preview)).toBe(true);
  });

  it("loads revision and certificate from detail GET", async () => {
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue({
      ok: true,
      wire: {
        appeal: {
          id: "ap_x",
          clientDisplayName: "Клиент",
          certificateId: "cert-1",
          certificatePromoCode: "RC-PREFILL",
          purchaseOrderId: null,
          stageKey: "ws_new",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        revision: 4,
        history: [],
        readOnly: false,
        access: { listAllowed: true, mutationsAllowed: true },
      },
    });
    const ctx = await loadReceivingAppealScannerContext("ap_x");
    expect(ctx).toMatchObject({
      status: "ready",
      appealId: "ap_x",
      revision: 4,
      certificateId: "cert-1",
      certificatePrefillCode: "RC-PREFILL",
    });
  });

  it("read-only detail fails closed", async () => {
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue({
      ok: true,
      wire: {
        appeal: {
          id: "ap_ro",
          clientDisplayName: "RO",
          purchaseOrderId: null,
          stageKey: "ws_new",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        revision: 1,
        history: [],
        readOnly: true,
      },
    });
    const ctx = await loadReceivingAppealScannerContext("ap_ro");
    expect(ctx.status).toBe("forbidden");
  });
});
