import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PartnerSearchResultInlineTerms } from "./PartnerSearchResultInlineTerms";
import { resetPartnerSearchInlineTermsCache } from "./partnerSearchResultInlineTerms";

vi.mock("./partnerSearchResultInlineTerms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./partnerSearchResultInlineTerms")>();
  return {
    ...actual,
    readPartnerCertificateProgramForSearchCard: vi.fn(),
  };
});

import { readPartnerCertificateProgramForSearchCard } from "./partnerSearchResultInlineTerms";

describe("PartnerSearchResultInlineTerms", () => {
  beforeEach(() => {
    resetPartnerSearchInlineTermsCache();
    vi.mocked(readPartnerCertificateProgramForSearchCard).mockReset();
  });

  it("renders inline summary without details accordion when loaded", async () => {
    vi.mocked(readPartnerCertificateProgramForSearchCard).mockResolvedValue({
      status: "loaded",
      items: [
        { category: "light", categoryLabel: "Светильники", poolPercent: 12 },
        { category: "wire", categoryLabel: "Кабель", poolPercent: 12 },
      ],
    });
    const { container } = render(<PartnerSearchResultInlineTerms partnerUserId="parity-store" />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-summary")).toBeInTheDocument(),
    );
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByTestId("agent-partner-search-result-terms-percent-headline")).toHaveTextContent(
      "12%",
    );
    expect(screen.getByText("Светильники")).toBeInTheDocument();
  });

  it("surfaces error with keyboard-accessible retry", async () => {
    vi.mocked(readPartnerCertificateProgramForSearchCard)
      .mockResolvedValueOnce({ status: "error", message: "Сеть недоступна" })
      .mockResolvedValueOnce({
        status: "loaded",
        items: [{ category: "a", categoryLabel: "A", poolPercent: 5 }],
      });
    render(<PartnerSearchResultInlineTerms partnerUserId="parity-specialist" />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-error")).toHaveTextContent(
        "Сеть недоступна",
      ),
    );
    await userEvent.click(screen.getByTestId("agent-partner-search-result-terms-retry"));
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-summary")).toBeInTheDocument(),
    );
    expect(readPartnerCertificateProgramForSearchCard).toHaveBeenCalledTimes(2);
  });
});
