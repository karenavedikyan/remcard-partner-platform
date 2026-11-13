import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsDirectionTabs } from "./ClientsDirectionTabs";

describe("P6.ClientsDirectionTabs keyboard", () => {
  it("roving tabIndex: only the selected tab is in the tab order", () => {
    const { rerender } = render(
      <ClientsDirectionTabs direction="incoming" onDirectionChange={() => undefined} />,
    );
    expect(screen.getByRole("tab", { name: "Клиенты у меня" })).toHaveAttribute("tabIndex", "0");
    expect(screen.getByRole("tab", { name: "Мои клиенты у партнёров" })).toHaveAttribute(
      "tabIndex",
      "-1",
    );

    rerender(<ClientsDirectionTabs direction="at-partners" onDirectionChange={() => undefined} />);
    expect(screen.getByRole("tab", { name: "Клиенты у меня" })).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByRole("tab", { name: "Мои клиенты у партнёров" })).toHaveAttribute(
      "tabIndex",
      "0",
    );
  });

  it("ArrowRight from incoming selects at-partners and moves focus", async () => {
    const user = userEvent.setup();
    const onDirectionChange = vi.fn();
    render(<ClientsDirectionTabs direction="incoming" onDirectionChange={onDirectionChange} />);
    const incoming = screen.getByRole("tab", { name: "Клиенты у меня" });
    incoming.focus();
    await user.keyboard("{ArrowRight}");
    expect(onDirectionChange).toHaveBeenCalledWith("at-partners");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
  });

  it("ArrowLeft from at-partners selects incoming and moves focus", async () => {
    const user = userEvent.setup();
    const onDirectionChange = vi.fn();
    render(<ClientsDirectionTabs direction="at-partners" onDirectionChange={onDirectionChange} />);
    const atPartners = screen.getByRole("tab", { name: "Мои клиенты у партнёров" });
    atPartners.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onDirectionChange).toHaveBeenCalledWith("incoming");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Клиенты у меня" }));
  });

  it("Home selects first tab; End selects last tab", async () => {
    const user = userEvent.setup();
    const onDirectionChange = vi.fn();
    render(<ClientsDirectionTabs direction="at-partners" onDirectionChange={onDirectionChange} />);
    screen.getByRole("tab", { name: "Мои клиенты у партнёров" }).focus();
    await user.keyboard("{Home}");
    expect(onDirectionChange).toHaveBeenCalledWith("incoming");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Клиенты у меня" }));

    onDirectionChange.mockClear();
    screen.getByRole("tab", { name: "Клиенты у меня" }).focus();
    await user.keyboard("{End}");
    expect(onDirectionChange).toHaveBeenCalledWith("at-partners");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Мои клиенты у партнёров" }),
    );
  });
});
