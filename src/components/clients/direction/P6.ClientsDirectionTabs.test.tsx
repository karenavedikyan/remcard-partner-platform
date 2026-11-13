import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsDirectionTabs } from "./ClientsDirectionTabs";

describe("P6.ClientsDirectionTabs", () => {
  it("exposes tablist a11y and aria-controls for both panels", () => {
    render(<ClientsDirectionTabs direction="incoming" onDirectionChange={() => undefined} />);
    const tablist = screen.getByRole("tablist", { name: "Направление клиентов" });
    expect(tablist).toBeTruthy();
    const incoming = screen.getByRole("tab", { name: "Клиенты у меня" });
    const atPartners = screen.getByRole("tab", { name: "Мои клиенты у партнёров" });
    expect(incoming).toHaveAttribute("aria-controls", "ca-clients-panel-incoming");
    expect(atPartners).toHaveAttribute("aria-controls", "ca-clients-panel-at-partners");
    expect(incoming).toHaveAttribute("aria-selected", "true");
    expect(atPartners).toHaveAttribute("aria-selected", "false");
  });

  it("calls onDirectionChange when at-partners tab is activated", async () => {
    const user = userEvent.setup();
    const onDirectionChange = vi.fn();
    render(<ClientsDirectionTabs direction="incoming" onDirectionChange={onDirectionChange} />);
    await user.click(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
    expect(onDirectionChange).toHaveBeenCalledWith("at-partners");
  });
});
