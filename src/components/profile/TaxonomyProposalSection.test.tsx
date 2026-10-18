import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxonomyProposalSection } from "./TaxonomyProposalSection";

vi.mock("@/lib/taxonomy-proposal-api", () => ({
  submitTaxonomyProposal: vi.fn(),
}));

import { submitTaxonomyProposal } from "@/lib/taxonomy-proposal-api";

describe("TaxonomyProposalSection", () => {
  it("keeps draft values when collapsing and clears on cancel", async () => {
    render(<TaxonomyProposalSection kind="STAGE" scopeKey="test" />);
    const toggle = screen.getByTestId("taxonomy-proposal-toggle-stage");
    fireEvent.click(toggle);
    const name = screen.getByPlaceholderText(/затопления/i);
    fireEvent.change(name, { target: { value: "Мой этап" } });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByDisplayValue("Мой этап")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(screen.queryByDisplayValue("Мой этап")).toBeNull();
  });

  it("Enter in name submits without bubbling", async () => {
    vi.mocked(submitTaxonomyProposal).mockResolvedValue({
      ok: true,
      created: true,
      message: "ok",
      proposal: {
        id: "1",
        kind: "SERVICE",
        status: "PENDING",
        originalName: "Новая услуга",
        createdAt: new Date().toISOString(),
      },
    });
    render(<TaxonomyProposalSection kind="SERVICE" scopeKey="test" />);
    fireEvent.click(screen.getByTestId("taxonomy-proposal-toggle-service"));
    const name = screen.getByPlaceholderText(/лепнины/i);
    fireEvent.change(name, { target: { value: "Новая услуга" } });
    fireEvent.keyDown(name, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(submitTaxonomyProposal).toHaveBeenCalled());
  });

  it("shows validation for empty name", () => {
    render(<TaxonomyProposalSection kind="SERVICE" scopeKey="test" />);
    fireEvent.click(screen.getByTestId("taxonomy-proposal-toggle-service"));
    fireEvent.click(screen.getByRole("button", { name: "Отправить предложение" }));
    expect(screen.getByRole("status").textContent).toMatch(/2 до 80/);
  });
});
