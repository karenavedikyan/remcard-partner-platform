import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import {
  bumpPartnerSearchInlineTermsViewerEpoch,
  readPartnerCertificateProgramForSearchCard,
  resetPartnerSearchInlineTermsCache,
} from "./partnerSearchResultInlineTerms";

vi.mock("@/lib/partner-certificate-program", () => ({
  fetchPartnerCertificateProgram: vi.fn(),
}));

import { fetchPartnerCertificateProgram } from "@/lib/partner-certificate-program";

describe("P25j inline terms cache correctness", () => {
  beforeEach(() => {
    resetPartnerSearchInlineTermsCache();
    vi.mocked(fetchPartnerCertificateProgram).mockReset();
  });

  it("dedupes only concurrent in-flight reads", async () => {
    vi.mocked(fetchPartnerCertificateProgram).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                status: "loaded",
                items: [{ category: "a", categoryLabel: "A", poolPercent: 10 }],
              }),
            20,
          );
        }),
    );
    await Promise.all([
      readPartnerCertificateProgramForSearchCard("p1"),
      readPartnerCertificateProgramForSearchCard("p1"),
    ]);
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(1);
  });

  it("does not memoize errors — a later read refetches", async () => {
    vi.mocked(fetchPartnerCertificateProgram)
      .mockResolvedValueOnce({ status: "error", message: "fail" })
      .mockResolvedValueOnce({
        status: "loaded",
        items: [{ category: "a", categoryLabel: "A", poolPercent: 5 }],
      });
    const first = await readPartnerCertificateProgramForSearchCard("p-err");
    const second = await readPartnerCertificateProgramForSearchCard("p-err");
    expect(first.status).toBe("error");
    expect(second.status).toBe("loaded");
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(2);
  });

  it("force retry after error refetches (clears in-flight slot)", async () => {
    vi.mocked(fetchPartnerCertificateProgram)
      .mockResolvedValueOnce({ status: "error", message: "fail" })
      .mockResolvedValueOnce({
        status: "loaded",
        items: [{ category: "a", categoryLabel: "A", poolPercent: 7 }],
      });
    await readPartnerCertificateProgramForSearchCard("p-retry");
    const recovered = await readPartnerCertificateProgramForSearchCard("p-retry", { force: true });
    expect(recovered.status).toBe("loaded");
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(2);
  });

  it("does not stick loaded results in a module-global settled cache", async () => {
    vi.mocked(fetchPartnerCertificateProgram).mockResolvedValue({
      status: "loaded",
      items: [{ category: "a", categoryLabel: "A", poolPercent: 11 }],
    });
    await readPartnerCertificateProgramForSearchCard("p-loaded");
    await readPartnerCertificateProgramForSearchCard("p-loaded");
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(2);
  });

  it("viewer epoch bump clears in-flight dedupe for session boundaries", async () => {
    let resolveSlow: (v: PartnerCertProgramState) => void = () => {};
    vi.mocked(fetchPartnerCertificateProgram).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSlow = resolve;
        }),
    );
    const slow = readPartnerCertificateProgramForSearchCard("p-session");
    bumpPartnerSearchInlineTermsViewerEpoch();
    vi.mocked(fetchPartnerCertificateProgram).mockResolvedValueOnce({
      status: "empty",
    });
    const afterBump = await readPartnerCertificateProgramForSearchCard("p-session");
    resolveSlow({ status: "error", message: "stale" });
    await slow;
    expect(afterBump.status).toBe("empty");
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(2);
  });

  it("supersedes stale in-flight completion after force", async () => {
    const resolvers: Array<(v: PartnerCertProgramState) => void> = [];
    vi.mocked(fetchPartnerCertificateProgram).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const first = readPartnerCertificateProgramForSearchCard("p-force");
    const second = readPartnerCertificateProgramForSearchCard("p-force", { force: true });
    resolvers[1]?.({ status: "loaded", items: [{ category: "b", categoryLabel: "B", poolPercent: 9 }] });
    await expect(second).resolves.toMatchObject({ status: "loaded" });
    resolvers[0]?.({ status: "error", message: "old" });
    await first;
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(2);
  });
});
