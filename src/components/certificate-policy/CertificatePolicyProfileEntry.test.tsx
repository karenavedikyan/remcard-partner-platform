import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatePolicyProfileEntry } from "./CertificatePolicyProfileEntry";

vi.mock("./CertificatePolicyDialog", () => ({
  CertificatePolicyDialog: ({ open, initialTab }: { open: boolean; initialTab?: string }) =>
    open ? <div data-testid="cp-dialog" data-initial-tab={initialTab} /> : null,
}));

describe("CertificatePolicyProfileEntry", () => {
  it("shows incoming-only entry for pure agent (no settings tab in dialog)", async () => {
    render(
      <CertificatePolicyProfileEntry viewerUserId="agent-1" canEditSettings={false} />,
    );
    expect(screen.getByTestId("cp-profile-entry")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("cp-open-settings"));
    const dialog = screen.getByTestId("cp-dialog");
    expect(dialog).toHaveAttribute("data-initial-tab", "incoming");
  });

  it("opens settings tab for owner-capable viewer", async () => {
    render(
      <CertificatePolicyProfileEntry viewerUserId="owner-1" canEditSettings />,
    );
    await userEvent.click(screen.getByTestId("cp-open-settings"));
    expect(screen.getByTestId("cp-dialog")).toHaveAttribute("data-initial-tab", "settings");
  });
});