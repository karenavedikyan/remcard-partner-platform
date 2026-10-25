import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
}));

import { remcardFetch } from "@/lib/api-client";
import {
  batchBusinessOwnerCertificates,
  deleteBusinessOwnerCertificate,
  fetchBusinessOwnerCertificate,
  fetchBusinessOwnerCertificates,
  patchBusinessOwnerCertificate,
} from "./api";

describe("business-owner certificates API adapter", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockResolvedValue({ ok: true });
  });

  it("lists with query params on business-owner route", async () => {
    await fetchBusinessOwnerCertificates({ archived: true, limit: 5, q: "x" });
    const url = vi.mocked(remcardFetch).mock.calls[0]?.[0] as string;
    expect(url.startsWith("/api/pro/business-owner-certificates?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1] ?? "");
    expect(params.get("archived")).toBe("true");
    expect(params.get("limit")).toBe("5");
    expect(params.get("q")).toBe("x");
  });

  it("fetches detail by encoded id", async () => {
    await fetchBusinessOwnerCertificate("cert/id");
    expect(remcardFetch).toHaveBeenCalledWith(
      "/api/pro/business-owner-certificates/cert%2Fid",
    );
  });

  it("PATCH and DELETE target the same scoped resource", async () => {
    await patchBusinessOwnerCertificate("c1", { action: "archive" });
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/business-owner-certificates/c1", {
      method: "PATCH",
      body: { action: "archive" },
    });

    await deleteBusinessOwnerCertificate("c1");
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/business-owner-certificates/c1", {
      method: "DELETE",
    });
  });

  it("batch POST uses batch subpath", async () => {
    await batchBusinessOwnerCertificates({ action: "restore", ids: ["a", "b"] });
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/business-owner-certificates/batch", {
      method: "POST",
      body: { action: "restore", ids: ["a", "b"] },
    });
  });
});
