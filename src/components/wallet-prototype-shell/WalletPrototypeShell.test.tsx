import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletPrototypeShell } from "./WalletPrototypeShell";

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(parseHex(foreground));
  const l2 = relativeLuminance(parseHex(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const LIGHT_ACTIVE = { text: "#b52a2e", bg: "#fff1f1", border: "#b52a2e", focus: "#b52a2e", canvas: "#ffffff" };
const DARK_ACTIVE = {
  text: "#ff9497",
  bg: "#3c272b",
  border: "#ffb4b6",
  focus: "#ffd1d3",
  canvas: "#202329",
};

describe("WalletPrototypeShell", () => {
  it("renders settlements by default and switches tabs both ways with a single active panel", async () => {
    const user = userEvent.setup();

    render(
      <WalletPrototypeShell
        shellTestId="wallet-shell"
        settlementsTabTestId="wallet-tab-settlements"
        requisitesTabTestId="wallet-tab-requisites"
        requisitesScopeTestId="wallet-requisites-scope"
        settlements={<div data-testid="settlements-body">settlements</div>}
        requisites={<div data-testid="requisites-body">requisites</div>}
      />,
    );

    expect(screen.getByTestId("wallet-shell")).toHaveAttribute("data-wallet-tab", "settlements");
    expect(screen.getByTestId("settlements-body")).toBeInTheDocument();
    expect(screen.queryByTestId("requisites-body")).toBeNull();

    await user.click(screen.getByTestId("wallet-tab-requisites"));
    expect(screen.getByTestId("wallet-shell")).toHaveAttribute("data-wallet-tab", "requisites");
    expect(screen.getByTestId("wallet-requisites-scope")).toBeInTheDocument();
    expect(screen.getByTestId("requisites-body")).toBeInTheDocument();
    expect(screen.queryByTestId("settlements-body")).toBeNull();

    await user.click(screen.getByTestId("wallet-tab-settlements"));
    expect(screen.getByTestId("settlements-body")).toBeInTheDocument();
    expect(screen.queryByTestId("requisites-body")).toBeNull();
  });

  it("supports keyboard navigation between tabs", async () => {
    const user = userEvent.setup();

    render(
      <WalletPrototypeShell
        shellTestId="wallet-shell-kb"
        settlementsTabTestId="wallet-kb-settlements"
        requisitesTabTestId="wallet-kb-requisites"
        requisitesScopeTestId="wallet-kb-requisites-scope"
        settlements={<div>Settlements pane</div>}
        requisites={<div>Requisites pane</div>}
      />,
    );

    const settlementsTab = screen.getByTestId("wallet-kb-settlements");
    const requisitesTab = screen.getByTestId("wallet-kb-requisites");

    settlementsTab.focus();
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(requisitesTab).toHaveFocus());
    expect(screen.getByText("Requisites pane")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    await vi.waitFor(() => expect(settlementsTab).toHaveFocus());
    expect(screen.getByText("Settlements pane")).toBeInTheDocument();
  });

  it("keeps keyboard focus inside each shell instance", async () => {
    const user = userEvent.setup();

    render(
      <>
        <WalletPrototypeShell
          shellTestId="wallet-shell-a"
          settlementsTabTestId="wallet-a-settlements"
          requisitesTabTestId="wallet-a-requisites"
          requisitesScopeTestId="wallet-a-requisites-scope"
          settlements={<div>A settlements</div>}
          requisites={<div>A requisites</div>}
        />
        <WalletPrototypeShell
          shellTestId="wallet-shell-b"
          settlementsTabTestId="wallet-b-settlements"
          requisitesTabTestId="wallet-b-requisites"
          requisitesScopeTestId="wallet-b-requisites-scope"
          settlements={<div>B settlements</div>}
          requisites={<div>B requisites</div>}
        />
      </>,
    );

    const shellBSettlements = screen.getByTestId("wallet-b-settlements");
    shellBSettlements.focus();
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(screen.getByTestId("wallet-b-requisites")).toHaveFocus());
    expect(screen.getByTestId("wallet-a-settlements")).not.toHaveFocus();
    expect(screen.getByTestId("wallet-a-requisites")).not.toHaveFocus();
  });

  it("exposes tab semantics and selected state", () => {
    render(
      <WalletPrototypeShell
        shellTestId="wallet-shell-a11y"
        settlementsTabTestId="wallet-a11y-settlements"
        requisitesTabTestId="wallet-a11y-requisites"
        requisitesScopeTestId="wallet-a11y-requisites-scope"
        settlements={<div>Pane A</div>}
        requisites={<div>Pane B</div>}
      />,
    );

    expect(screen.getByRole("tablist", { name: "Кошелёк" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Взаиморасчёты" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Реквизиты" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Pane A");
  });

  describe("contrast tokens", () => {
    it("meets text contrast for light and dark active tabs", () => {
      expect(contrastRatio(LIGHT_ACTIVE.text, LIGHT_ACTIVE.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(DARK_ACTIVE.text, DARK_ACTIVE.bg)).toBeGreaterThanOrEqual(4.5);
    });

    it("meets non-text contrast for focus and borders", () => {
      expect(contrastRatio(LIGHT_ACTIVE.focus, LIGHT_ACTIVE.canvas)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(LIGHT_ACTIVE.border, LIGHT_ACTIVE.canvas)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(DARK_ACTIVE.focus, DARK_ACTIVE.canvas)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(DARK_ACTIVE.border, DARK_ACTIVE.canvas)).toBeGreaterThanOrEqual(3);
    });
  });
});
