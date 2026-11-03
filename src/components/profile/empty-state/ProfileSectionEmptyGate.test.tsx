/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileSectionEmptyGate } from "./ProfileSectionEmptyGate";

describe("ProfileSectionEmptyGate", () => {
  it("shows empty intro until CTA reveals wizard", () => {
    render(
      <ProfileSectionEmptyGate showEmptyIntro role="store">
        <div data-testid="profile-wizard">wizard</div>
      </ProfileSectionEmptyGate>,
    );
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-wizard")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("profile-empty-start"));
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("profile-wizard")).toBeInTheDocument();
  });

  it("skips empty intro when profile is not empty", () => {
    render(
      <ProfileSectionEmptyGate showEmptyIntro={false} role="agent">
        <div data-testid="profile-wizard">wizard</div>
      </ProfileSectionEmptyGate>,
    );
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("profile-wizard")).toBeInTheDocument();
  });

  it("calls onRevealWizard when opening wizard", () => {
    const onRevealWizard = vi.fn();
    render(
      <ProfileSectionEmptyGate showEmptyIntro role="company" onRevealWizard={onRevealWizard}>
        <span>form</span>
      </ProfileSectionEmptyGate>,
    );
    fireEvent.click(screen.getByTestId("profile-empty-start"));
    expect(onRevealWizard).toHaveBeenCalledTimes(1);
  });
});
