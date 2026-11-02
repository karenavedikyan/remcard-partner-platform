import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletPrototypeShell } from "./WalletPrototypeShell";

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
});
