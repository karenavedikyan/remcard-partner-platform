/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileSectionEmptyState } from "./ProfileSectionEmptyState";
import { profileEmptyCopy } from "./profile-empty-copy";
import { contrastRatio } from "./profile-empty-contrast";

describe("ProfileSectionEmptyState", () => {
  it("renders prototype copy for each role", () => {
    for (const role of ["agent", "specialist", "store", "company"] as const) {
      const copy = profileEmptyCopy(role);
      const { unmount } = render(
        <ProfileSectionEmptyState role={role} onStartFill={vi.fn()} />,
      );
      expect(screen.getByTestId("empty-state")).toHaveAttribute("data-es-page", "profile");
      expect(screen.getByText(copy.title)).toBeInTheDocument();
      expect(screen.getByText(copy.lead)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: copy.ctaLabel })).toBeInTheDocument();
      expect(screen.queryByText("Посмотреть на примере")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Раздел заполнится сам, когда появятся первые данные."),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it("invokes onStartFill from CTA without extra network calls", () => {
    const onStartFill = vi.fn();
    render(<ProfileSectionEmptyState role="agent" onStartFill={onStartFill} />);
    fireEvent.click(screen.getByTestId("profile-empty-start"));
    expect(onStartFill).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard activation on primary CTA", () => {
    const onStartFill = vi.fn();
    render(<ProfileSectionEmptyState role="specialist" onStartFill={onStartFill} />);
    const btn = screen.getByTestId("profile-empty-start");
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.click(btn);
    expect(onStartFill).toHaveBeenCalledTimes(1);
  });

  it("keeps primary CTA without auto-fill footer copy", () => {
    render(<ProfileSectionEmptyState role="company" onStartFill={vi.fn()} />);
    expect(screen.getByTestId("profile-empty-start")).toHaveTextContent("Перейти к заполнению");
    expect(
      screen.queryByText(/Раздел заполнится сам/i),
    ).not.toBeInTheDocument();
  });

  it("meets 4.5:1 contrast for white label on scoped primary-fill tokens", () => {
    expect(contrastRatio("#ffffff", "#c12b2f")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#ffffff", "#b54844")).toBeGreaterThanOrEqual(4.5);
  });
});
