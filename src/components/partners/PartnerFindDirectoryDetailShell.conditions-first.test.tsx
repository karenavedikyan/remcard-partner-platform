import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";
import type { PartnerSearchResult } from "@/lib/types";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";

const partner = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "company-1", displayName: "Компания 62", city: "Краснодар", photoUrl: null, description: null,
  specializations: [], badges: [], storeCategories: [], branches: [], rating: null, ratingCount: 0,
  partnershipStatus: "ACTIVE", partnerType: "COMPANY", partnerTypeLabel: "Компания",
  workingProductLabels: ["Двери", "Напольные покрытия"], workingServiceLabels: [], workingStageLabels: ["Ремонт"],
  ...overrides,
});

const snapshot: PartnerCertProgramState = {
  status: "loaded",
  policy: { validityDays: 14, purchaseLimit: 1, minimumPurchaseAmount: null, promotionsCompatible: false, exclusionsText: null },
  items: [
    { category: "doors", categoryLabel: "doors", poolPercent: 12 },
    { category: "flooring", categoryLabel: "flooring", poolPercent: 0 },
    { category: "paint", categoryLabel: "Особая краска", poolPercent: 7 },
  ],
} as unknown as PartnerCertProgramState;

function renderDetail(p = partner()) {
  return render(
    <PartnerFindDirectoryDetailShell partner={p} onBack={() => {}} onInvite={() => {}}
      showPublicCertificatePolicy agentTermsSnapshot={snapshot} />,
  );
}

describe("search profile detail leads with conditions", () => {
  it("puts name/type/city, then category percentages, before specialization, description and boilerplate", () => {
    renderDetail(partner({ description: "Реальное описание компании" }));
    const shell = screen.getByTestId("partner-find-directory-detail-shell");
    const order = ["Компания 62", "Условия приёма сертификата", "Реальное описание компании", "Специализация и этапы", "уже зарегистрирован"]
      .map((text) => shell.textContent!.indexOf(text));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("shows Russian category labels with percentages, keeping a real custom label and 0% visible", () => {
    renderDetail();
    const pools = screen.getByTestId("cp-public-pools");
    expect(pools).toHaveTextContent("Двери: общий процент 12%");
    expect(pools).toHaveTextContent("Напольные покрытия: общий процент 0%");
    expect(pools).toHaveTextContent("Особая краска: общий процент 7%");
    expect(pools).not.toHaveTextContent(/doors|flooring/);
  });

  it("lists the category percentages before the secondary restriction chips", () => {
    renderDetail();
    const block = screen.getByTestId("partner-find-directory-public-certificate-policy-details");
    const pools = within(block).getByTestId("cp-public-pools");
    const chips = within(block).getByTestId("cp-compact-chips");
    expect(pools.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("collapses specialization and stages once, without a duplicate topics line", () => {
    renderDetail();
    const fold = screen.getByTestId("partner-find-directory-detail-profile-directions");
    expect(fold.tagName).toBe("DETAILS");
    expect(fold).not.toHaveAttribute("open");
    expect(screen.queryByTestId("partner-find-directory-detail-topics")).toBeNull();
    expect(screen.getAllByText(/Напольные покрытия/).filter((el) => !el.closest("[data-testid='cp-public-pools']"))).toHaveLength(1);
  });

  it("renders neither a description placeholder nor an empty directions block for a bare profile", () => {
    renderDetail(partner({ workingProductLabels: [], workingStageLabels: [] }));
    expect(screen.queryByTestId("partner-find-directory-detail-description")).toBeNull();
    expect(screen.queryByTestId("partner-find-directory-detail-description-empty")).toBeNull();
  });

  it("keeps a real description and the invite action", () => {
    renderDetail(partner({ description: "Реальное описание компании" }));
    expect(screen.getByTestId("partner-find-directory-detail-description")).toHaveTextContent("Реальное описание компании");
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeInTheDocument();
  });
});
