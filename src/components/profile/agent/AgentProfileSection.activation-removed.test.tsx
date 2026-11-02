import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentProfileSection } from "./AgentProfileSection";
import { fetchAgentProfileStatus, enableR02AgentActivity } from "@/lib/agent-profile/api";
import type { AgentProfileStatusResponse } from "@/lib/agent-profile/types";

vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: vi.fn(),
  enableR02AgentActivity: vi.fn(),
}));
vi.mock("./AgentProfileWizard", () => ({
  AgentProfileWizard: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="existing-agent-wizard" data-disabled={String(disabled)} />
  ),
}));
vi.mock("./AgentPayoutRequisitesPanel", () => ({
  AgentPayoutRequisitesPanel: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="existing-agent-requisites" data-disabled={String(disabled)} />
  ),
}));

const status: AgentProfileStatusResponse = {
  contractVersion: "2026-10-15.r02.1", featureEnabled: true,
  hasAgentActivity: false, eligible: false, profileComplete: false, userId: "synthetic-profile",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAgentProfileStatus).mockResolvedValue(status);
});

describe("no opt-in Agent activity prompts in partner profiles", () => {
  it.each([
    { activities: [] }, { activities: ["STORE"] }, { activities: ["SERVICE"] },
    { activities: ["MASTER"] }, { activities: ["COMPANY"] },
  ])(
    "does not offer activation for $activities, even when the feature is enabled",
    async ({ activities }) => {
      const { container } = render(
        <AgentProfileSection
          userId="synthetic-profile"
          partnerActivities={activities}
          basicsEditable
        />,
      );
      await waitFor(() => expect(fetchAgentProfileStatus).toHaveBeenCalledOnce());
      await waitFor(() => expect(container).toBeEmptyDOMElement());
      expect(screen.queryByTestId("agent-activity-enable")).not.toBeInTheDocument();
      expect(enableR02AgentActivity).not.toHaveBeenCalled();
    },
  );

  it("keeps the existing pure-agent wizard and payout panel", async () => {
    vi.mocked(fetchAgentProfileStatus).mockResolvedValue({
      ...status, hasAgentActivity: true, eligible: true,
    });
    render(
      <AgentProfileSection userId="synthetic-agent" partnerActivities={["AGENT"]}
        basicsEditable layout="parity-overview" />,
    );
    expect(await screen.findByTestId("existing-agent-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("existing-agent-requisites")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-activity-enable")).not.toBeInTheDocument();
  });

  it("keeps requisites navigation for an existing mixed agent profile", async () => {
    vi.mocked(fetchAgentProfileStatus).mockResolvedValue({
      ...status, hasAgentActivity: true, eligible: true,
    });
    const ui = userEvent.setup();
    render(
      <AgentProfileSection userId="synthetic-mixed" partnerActivities={["STORE", "AGENT"]}
        basicsEditable />,
    );
    expect(await screen.findByTestId("existing-agent-wizard")).toBeInTheDocument();
    await ui.click(screen.getByRole("tab", { name: "Реквизиты", exact: true }));
    expect(screen.getByTestId("existing-agent-requisites")).toBeInTheDocument();
    expect(enableR02AgentActivity).not.toHaveBeenCalled();
  });

  it("preserves authoritative active-agent status when local activities are stale", async () => {
    vi.mocked(fetchAgentProfileStatus).mockResolvedValue({
      ...status, hasAgentActivity: true, eligible: true,
    });
    render(
      <AgentProfileSection userId="synthetic-stale" partnerActivities={[]} basicsEditable />,
    );
    expect(await screen.findByTestId("existing-agent-wizard")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-activity-enable")).not.toBeInTheDocument();
  });

  it("preserves read-only editing restrictions for an existing agent", async () => {
    vi.mocked(fetchAgentProfileStatus).mockResolvedValue({
      ...status, hasAgentActivity: true, eligible: true,
    });
    render(
      <AgentProfileSection userId="synthetic-readonly" partnerActivities={["AGENT"]}
        basicsEditable={false} layout="parity-overview" />,
    );
    expect(await screen.findByTestId("existing-agent-wizard")).toHaveAttribute("data-disabled", "true");
    expect(screen.getByTestId("existing-agent-requisites")).toHaveAttribute("data-disabled", "true");
  });

  it("does not restore a prompt when the feature is disabled", async () => {
    vi.mocked(fetchAgentProfileStatus).mockResolvedValue({ ...status, featureEnabled: false });
    const { container } = render(
      <AgentProfileSection userId="synthetic-disabled" partnerActivities={[]} basicsEditable />,
    );
    await waitFor(() => expect(fetchAgentProfileStatus).toHaveBeenCalledOnce());
    expect(container).toBeEmptyDOMElement();
  });

  it("removes specialist opt-in and the legacy activity checkbox from the editor", () => {
    const editor = readFileSync(resolve(process.cwd(), "src/components/profile/ProfileEditor.tsx"), "utf8");
    expect(editor.includes("SpecialistAgentActivityCompact")).toBe(false);
    expect(editor.includes('data-testid="profile-agent-activity"')).toBe(false);
    expect(editor.includes('data-testid="profile-agent-activity-row"')).toBe(false);
  });
});
