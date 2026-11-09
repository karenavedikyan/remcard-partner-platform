import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildStoreCertificateClientCardModel,
  deriveStoreCertCardState,
} from "@/lib/storeCertificateClientCardModel";
import type { StoreCertificate } from "@/lib/certificate-types";

const base: StoreCertificate = {
  id: "c1",
  promoCode: "RC-X9Z0WZ",
  qrCode: "qrMixedCase",
  issuerKindSnapshot: "SPECIALIST",
  status: "ACTIVE",
  validUntil: null,
  maxUsages: 3,
  usageCount: 0,
  createdAt: new Date().toISOString(),
  discountPercent: 10,
  partners: [
    {
      id: "p1",
      storeUserId: "s1",
      storeName: "ОПТОВИК",
      partnershipId: "pt1",
      isSelfScan: false,
      categories: [{ category: "wholesale", categoryLabel: "ОПТ", discountPercent: 10 }],
    },
  ],
};

describe("storeCertificateClientCardModel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds client card fields for specialist display code", () => {
    const model = buildStoreCertificateClientCardModel(
      base,
      "С-RC-X9Z0WZ",
      "https://example.com/certificate/qrMixedCase",
    );
    expect(model.visibleCode).toBe("С-RC-X9Z0WZ");
    expect(model.title).toBe("Скидочный сертификат");
    expect(model.pctTextValue).toBe("−10 %");
    expect(model.pctSubtitleText).toContain("ОПТОВИК");
    expect(model.termTextValue).toBe("Бессрочный");
    expect(model.active).toBe(true);
  });

  it("uses agent title for AGENT issuer", () => {
    const model = buildStoreCertificateClientCardModel(
      { ...base, issuerKindSnapshot: "AGENT" },
      "А-RC-X9Z0WZ",
      "https://x/c/qr",
    );
    expect(model.title).toBe("Сертификат Ремкард");
  });

  it("does not fabricate −0% without discount data", () => {
    const model = buildStoreCertificateClientCardModel(
      {
        ...base,
        discountPercent: null,
        partners: [{ ...base.partners![0]!, categories: [] }],
      },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.pctTextValue).toBe("—");
  });

  it("treats USED_FULLY as inactive used", () => {
    const model = buildStoreCertificateClientCardModel(
      { ...base, status: "USED_FULLY", maxUsages: 0 },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.active).toBe(false);
    expect(deriveStoreCertCardState({ ...base, status: "USED_FULLY", maxUsages: 0 })).toBe("used");
  });

  it("treats past validUntil on ACTIVE as expired presentation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const cert = { ...base, status: "ACTIVE" as const, validUntil: "2026-01-01T00:00:00.000Z" };
    const model = buildStoreCertificateClientCardModel(cert, "RC-X", "https://x/c/qr");
    expect(model.active).toBe(false);
    expect(model.state).toBe("expired");
    expect(model.stampText).toBe("Истёк");
  });

  it("handles invalid validUntil without implying usability", () => {
    const model = buildStoreCertificateClientCardModel(
      { ...base, validUntil: "not-a-date" },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.termTextValue).toBe("Срок не указан");
    expect(model.active).toBe(false);
    expect(model.state).toBe("unavailable");
    expect(model.stampText).toBe("Недоступен");
  });

  it("shows explicit zero discount on certificate", () => {
    const model = buildStoreCertificateClientCardModel(
      {
        ...base,
        discountPercent: 0,
        partners: [
          {
            ...base.partners![0]!,
            categories: [{ category: "wholesale", categoryLabel: "ОПТ", discountPercent: 0 }],
          },
        ],
      },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.pctTextValue).toBe("−0 %");
  });

  it("shows range when cert 10 with category discounts 5 and 10", () => {
    const model = buildStoreCertificateClientCardModel(
      {
        ...base,
        discountPercent: 10,
        partners: [
          {
            ...base.partners![0]!,
            categories: [
              { category: "a", categoryLabel: "A", discountPercent: 5 },
              { category: "b", categoryLabel: "B", discountPercent: 10 },
            ],
          },
        ],
      },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.pctTextValue).toBe("до −10 %");
  });

  it("shows range when category discounts include 0 and 10", () => {
    const model = buildStoreCertificateClientCardModel(
      {
        ...base,
        discountPercent: null,
        partners: [
          {
            ...base.partners![0]!,
            categories: [
              { category: "a", categoryLabel: "A", discountPercent: 0 },
              { category: "b", categoryLabel: "B", discountPercent: 10 },
            ],
          },
        ],
      },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.pctTextValue).toBe("до −10 %");
  });

  it("treats empty status as unavailable", () => {
    const model = buildStoreCertificateClientCardModel(
      { ...base, status: "" },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.active).toBe(false);
    expect(deriveStoreCertCardState({ ...base, status: "" })).toBe("unavailable");
  });

  it("keeps USED_PARTIALLY active when still valid", () => {
    const model = buildStoreCertificateClientCardModel(
      { ...base, status: "USED_PARTIALLY", usageCount: 1 },
      "RC-X",
      "https://x/c/qr",
    );
    expect(model.active).toBe(true);
    expect(deriveStoreCertCardState({ ...base, status: "USED_PARTIALLY" })).toBe("active");
  });
});
