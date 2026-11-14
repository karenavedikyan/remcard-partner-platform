import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECEIVING_CERTIFICATE_ENTRY_INVALID_FALLBACK,
  resolveReceivingCertificateEntryUserMessage,
  submitReceivingCertificateEntry,
} from "@/lib/clients-parity/receiving-appeals-api";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, remcardFetch: vi.fn() };
});

import { remcardFetch } from "@/lib/api-client";

describe("resolveReceivingCertificateEntryUserMessage", () => {
  it("prefers non-empty message over reason", () => {
    expect(
      resolveReceivingCertificateEntryUserMessage({
        message: " Сообщение сервера ",
        reason: "Только для филиала X",
      }),
    ).toBe("Сообщение сервера");
  });

  it("uses reason when message is missing or blank", () => {
    expect(
      resolveReceivingCertificateEntryUserMessage({
        message: "  ",
        reason: "Сертификат не принимается в этом филиале",
      }),
    ).toBe("Сертификат не принимается в этом филиале");
  });

  it("falls back when both fields are malformed or empty", () => {
    expect(resolveReceivingCertificateEntryUserMessage({ message: null, reason: {} })).toBe(
      RECEIVING_CERTIFICATE_ENTRY_INVALID_FALLBACK,
    );
    expect(resolveReceivingCertificateEntryUserMessage({}, "Custom fallback")).toBe("Custom fallback");
  });
});

describe("submitReceivingCertificateEntry invalid certificate wire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surfaces reason when message is absent", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      valid: false,
      reason: "Сертификат выпущен для другого филиала",
    });
    const res = await submitReceivingCertificateEntry({ promoCode: "RC-1" }, { readOnly: false });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("INVALID");
      expect(res.message).toBe("Сертификат выпущен для другого филиала");
      expect(res.reason).toBe("Сертификат выпущен для другого филиала");
    }
  });

  it("success path unchanged when valid with appeal", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      valid: true,
      outcome: "created",
      appeal: {
        id: "ap_1",
        clientDisplayName: "Клиент",
        stageKey: "ws_new",
        receivingPartnerUserId: "u1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    const res = await submitReceivingCertificateEntry({ promoCode: "RC-1" }, { readOnly: false });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appealId).toBe("ap_1");
    }
  });

  it("uses fallback when valid false without text", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ valid: false, reason: null });
    const res = await submitReceivingCertificateEntry({ promoCode: "RC-1" }, { readOnly: false });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toBe(RECEIVING_CERTIFICATE_ENTRY_INVALID_FALLBACK);
    }
  });
});