import { useEffect } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";

afterEach(cleanup);

describe("Hub modal lazy persistent mount", () => {
  it("does not start hidden children before first open and preserves them afterwards", () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function SearchChild() {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <input aria-label="Черновик поиска" defaultValue="Краснодар" />;
    }
    const props = {
      tab: "find" as const,
      titleFind: "Найти партнёра",
      titleLink: "Пригласить",
      onTabChange: vi.fn(),
      onClose: vi.fn(),
    };
    const view = render(
      <AgentPartnerHubModal {...props} open={false}><SearchChild /></AgentPartnerHubModal>,
    );
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Черновик поиска")).toBeNull();
    view.rerender(
      <AgentPartnerHubModal {...props} open><SearchChild /></AgentPartnerHubModal>,
    );
    const input = screen.getByLabelText("Черновик поиска");
    expect(mounted).toHaveBeenCalledTimes(1);
    view.rerender(
      <AgentPartnerHubModal {...props} open={false}><SearchChild /></AgentPartnerHubModal>,
    );
    expect(unmounted).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    view.rerender(
      <AgentPartnerHubModal {...props} open><SearchChild /></AgentPartnerHubModal>,
    );
    expect(screen.getByLabelText("Черновик поиска")).toBe(input);
    expect(mounted).toHaveBeenCalledTimes(1);
  });
});
