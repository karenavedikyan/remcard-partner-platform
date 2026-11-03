import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WalletSectionEmptyState } from "./WalletSectionEmptyState";
import styles from "./wallet-empty.module.css";

/** Matches PAN-like or masked digit tails (not currency amounts on the hero). */
const CARD_NUMBER_LIKE = /(?:••••|\*{4}|\b\d{4}\b(?!\s*₽))/;

describe("WalletSectionEmptyState", () => {
  it("renders seller onboarding for store with scanner CTA", () => {
    render(<WalletSectionEmptyState role="store" />);
    expect(screen.getByTestId("wallet-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Кошелёк: кому и сколько")).toBeInTheDocument();
    const cta = screen.getByTestId("wallet-empty-primary-cta");
    expect(cta).toHaveAttribute("href", "/scanner");
    expect(screen.queryByText(/посмотреть на примере/i)).toBeNull();
  });

  it("renders earner onboarding for agent with certificate create link", () => {
    render(<WalletSectionEmptyState role="agent" />);
    expect(screen.getByText("Здесь будут ваши начисления")).toBeInTheDocument();
    expect(screen.getByTestId("wallet-empty-primary-cta")).toHaveAttribute(
      "href",
      "/certificates/new",
    );
  });

  it("lists three numbered steps", () => {
    render(<WalletSectionEmptyState role="specialist" />);
    expect(screen.getAllByText(/^1$|^2$|^3$/)).toHaveLength(3);
  });

  it("decorative empty card shows neutral label without fake card digits", () => {
    const { container } = render(<WalletSectionEmptyState role="company" />);
    const card = container.querySelector(`.${styles.card}`);
    expect(card).toBeTruthy();
    expect(card).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Карта партнёра")).toBeInTheDocument();
    const cardText = card?.textContent ?? "";
    expect(cardText).not.toMatch(CARD_NUMBER_LIKE);
    expect(cardText).not.toContain("0000");
    expect(cardText).not.toContain("••••");
  });
});
