import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/specialist-certificates/api", () => ({
  patchSpecialistIssuerCertificate: vi.fn(),
  fetchSpecialistIssuerCertificate: vi.fn(),
}));

vi.mock("./api", () => ({
  patchBusinessOwnerCertificate: vi.fn(),
  fetchBusinessOwnerCertificate: vi.fn(),
}));

import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";
import { patchBusinessOwnerCertificate } from "./api";
import { patchIssuerCertificate } from "./issuer-api";

describe("patchIssuerCertificate", () => {
  beforeEach(() => {
    vi.mocked(patchSpecialistIssuerCertificate).mockResolvedValue({ ok: true });
    vi.mocked(patchBusinessOwnerCertificate).mockResolvedValue({ ok: true });
  });

  it("routes specialist mode to specialist API", async () => {
    await patchIssuerCertificate("specialist", "c1", { userAlias: "A" });
    expect(patchSpecialistIssuerCertificate).toHaveBeenCalledWith("c1", { userAlias: "A" });
    expect(patchBusinessOwnerCertificate).not.toHaveBeenCalled();
  });

  it("routes business mode to business-owner API", async () => {
    vi.mocked(patchSpecialistIssuerCertificate).mockClear();
    await patchIssuerCertificate("business", "c2", { action: "archive" });
    expect(patchBusinessOwnerCertificate).toHaveBeenCalledWith("c2", { action: "archive" });
    expect(patchSpecialistIssuerCertificate).not.toHaveBeenCalled();
  });
});
