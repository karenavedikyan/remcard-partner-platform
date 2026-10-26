import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerAgentGeneralTermsEditor } from "./PartnerAgentGeneralTermsEditor";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(),
}));

const { remcardFetch } = await import("@/lib/api-client");
const { fetchPartnerTaxonomy } = await import("@/lib/partner-taxonomy");

describe("PartnerAgentGeneralTermsEditor", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockResolvedValue({
      limits: [
        {
          id: "l1",
          category: "doors",
          categoryLabel: "Двери",
          poolPercent: 13,
        },
      ],
    });
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [{ id: "windows", label: "Окна" }],
      services: [],
    });
  });

  it("renders lead copy and themed category select when editable", async () => {
    render(<PartnerAgentGeneralTermsEditor canEdit />);

    await waitFor(() => {
      expect(screen.getByTestId("agent-general-terms-lead")).toBeInTheDocument();
    });

    expect(screen.getByTestId("agent-general-terms-lead")).toHaveTextContent(
      /видны агентам в RemCard/i,
    );
    expect(screen.getByTestId("agent-general-terms-category-select")).toBeInTheDocument();
    expect(screen.getByLabelText("Общий %")).toHaveValue("13");
  });
});
