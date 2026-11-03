import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamSectionNewPartnerEmpty } from "./TeamSectionNewPartnerEmpty";
import { contrastRatio } from "@/lib/theme-contrast";

describe("TeamSectionNewPartnerEmpty", () => {
  it("renders prototype team copy without demo explainer link", () => {
    render(<TeamSectionNewPartnerEmpty onInvite={vi.fn()} />);
    expect(screen.getByTestId("empty-state")).toHaveAttribute("data-es-page", "team");
    expect(screen.getByText("Пока пусто")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Пригласите команду" })).toBeInTheDocument();
    expect(screen.getByText(/Персональное приглашение/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Посмотреть на примере/i })).not.toBeInTheDocument();
  });

  it("fires invite handler from primary CTA only on click", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<TeamSectionNewPartnerEmpty onInvite={onInvite} />);
    expect(onInvite).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("team-new-partner-empty-cta"));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("uses theme token pairs with at least 4.5:1 contrast", () => {
    expect(contrastRatio("#6c706a", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#c12b2f", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#252923", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#a6aea4", "#202520")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#fda4af", "#202520")).toBeGreaterThanOrEqual(4.5);
  });
});
