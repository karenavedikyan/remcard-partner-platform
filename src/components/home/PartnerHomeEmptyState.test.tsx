import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerHomeEmptyState } from "./PartnerHomeEmptyState";

describe("PartnerHomeEmptyState", () => {
  it("renders specialist copy without demo explainer link", () => {
    render(<PartnerHomeEmptyState role="specialist" />);
    expect(screen.getByTestId("empty-state")).toHaveAttribute("data-es-page", "home");
    expect(
      screen.getByRole("heading", { level: 2, name: /Начните с профиля и партнёров/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("es-nav-profile")).toHaveAttribute("href", "/profile");
    expect(screen.getByTestId("es-nav-partners")).toHaveAttribute("href", "/partners");
    expect(screen.queryByRole("button", { name: /Посмотреть на примере/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Раздел заполнится сам, когда появятся первые данные/),
    ).toBeInTheDocument();
  });

  it("renders company secondary CTA to team section", () => {
    render(<PartnerHomeEmptyState role="company" />);
    expect(screen.getByTestId("es-nav-team")).toHaveAttribute("href", "/profile?section=team");
  });
});
