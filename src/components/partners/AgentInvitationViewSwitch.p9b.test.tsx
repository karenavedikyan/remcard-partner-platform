import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentInvitationViewSwitch } from "./AgentInvitationViewSwitch";

describe("AgentInvitationViewSwitch P9b", () => {
  it("defaults pressed state from viewMode and reports exact mode on click", async () => {
    const onViewModeChange = vi.fn();
    const { rerender } = render(
      <AgentInvitationViewSwitch
        flow="incoming"
        viewMode="list"
        onViewModeChange={onViewModeChange}
      />,
    );

    const root = screen.getByTestId("agent-invitation-view-switch-incoming");
    expect(root).toHaveAttribute("aria-label", "Вид входящих предложений");
    expect(screen.getByTestId("agent-invitation-view-switch-incoming-list")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("agent-invitation-view-switch-incoming-cards")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await userEvent.click(screen.getByTestId("agent-invitation-view-switch-incoming-cards"));
    expect(onViewModeChange).toHaveBeenCalledWith("cards");

    rerender(
      <AgentInvitationViewSwitch
        flow="incoming"
        viewMode="cards"
        onViewModeChange={onViewModeChange}
      />,
    );
    expect(screen.getByTestId("agent-invitation-view-switch-incoming-cards")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("outgoing switch uses distinct testids and group label", () => {
    render(
      <AgentInvitationViewSwitch flow="outgoing" viewMode="list" onViewModeChange={vi.fn()} />,
    );
    expect(screen.getByTestId("agent-invitation-view-switch-outgoing")).toHaveAttribute(
      "aria-label",
      "Вид исходящих предложений",
    );
    expect(screen.getByRole("button", { name: "Список" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Карточки" })).toBeVisible();
  });
});
