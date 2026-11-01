import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  formatPartnerSearchInlineTermLine,
  partnerSearchInlinePercentHeadline,
  partnerSearchInlineRemainingCount,
  readPartnerCertificateProgramForSearchCard,
  resetPartnerSearchInlineTermsCache,
} from "./partnerSearchResultInlineTerms";

vi.mock("@/lib/partner-certificate-program", () => ({
  fetchPartnerCertificateProgram: vi.fn(),
}));

import { fetchPartnerCertificateProgram } from "@/lib/partner-certificate-program";

describe("partnerSearchResultInlineTerms formatters", () => {
  it("builds equal percent headline from finite pool values only", () => {
    expect(
      partnerSearchInlinePercentHeadline([
        { category: "a", categoryLabel: "A", poolPercent: 12 },
        { category: "b", categoryLabel: "B", poolPercent: 12 },
      ]),
    ).toBe("12%");
  });

  it("builds range headline and skips non-finite percents", () => {
    expect(
      partnerSearchInlinePercentHeadline([
        { category: "a", categoryLabel: "A", poolPercent: 8 },
        { category: "b", categoryLabel: "B", poolPercent: 15 },
        { category: "c", categoryLabel: "C", poolPercent: Number.NaN },
      ]),
    ).toBe("от 8 до 15%");
  });

  it("does not invent zero for unknown percent", () => {
    const line = formatPartnerSearchInlineTermLine({
      category: "x",
      categoryLabel: "Без процента",
      poolPercent: Number.NaN,
    });
    expect(line.percentText).toBeNull();
    expect(line.percentUnavailable).toBe(true);
  });

  it("appends zero-participation note for finite 0%", () => {
    const line = formatPartnerSearchInlineTermLine({
      category: "z",
      categoryLabel: "Демо",
      poolPercent: 0,
    });
    expect(line.percentText).toBe("0%");
    expect(line.percentText).not.toContain("участие");
  });

  it("counts remaining categories including truncated flag", () => {
    const items = [
      { category: "1", categoryLabel: "1", poolPercent: 1 },
      { category: "2", categoryLabel: "2", poolPercent: 2 },
      { category: "3", categoryLabel: "3", poolPercent: 3 },
      { category: "4", categoryLabel: "4", poolPercent: 4 },
    ];
    expect(partnerSearchInlineRemainingCount(items, false)).toBe(1);
    expect(partnerSearchInlineRemainingCount(items.slice(0, 3), true)).toBe(1);
  });
});

describe("readPartnerCertificateProgramForSearchCard", () => {
  beforeEach(() => {
    resetPartnerSearchInlineTermsCache();
    vi.mocked(fetchPartnerCertificateProgram).mockReset();
  });

  it("dedupes concurrent reads for the same partner id", async () => {
    vi.mocked(fetchPartnerCertificateProgram).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                status: "loaded",
                items: [{ category: "a", categoryLabel: "A", poolPercent: 10 }],
              }),
            10,
          );
        }),
    );
    const [a, b] = await Promise.all([
      readPartnerCertificateProgramForSearchCard("p-dedup"),
      readPartnerCertificateProgramForSearchCard("p-dedup"),
    ]);
    expect(a.status).toBe("loaded");
    expect(b.status).toBe("loaded");
    expect(fetchPartnerCertificateProgram).toHaveBeenCalledTimes(1);
  });
});
