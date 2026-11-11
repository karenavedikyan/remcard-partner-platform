import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";
import type { WalletAccrualsData, WalletPresentation } from "@/lib/wallet-accruals/types";
import { ONBOARDING_READ_ONLY_HISTORY_HREF } from "@/lib/onboarding-step/read-only-history";

vi.mock("./wallet-accruals.global.css", () => ({}));

const presentation: WalletPresentation = {
  ribbonLabel: "Кошелёк",
  cardIdentifier: null,
};

const data: WalletAccrualsData = {
  receivable: [],
  payable: [],
  completed: [],
};

describe("WalletAccrualsShell /history entry", () => {
  it("links to the existing HistoryHub without a second ledger", () => {
    render(<WalletAccrualsShell data={data} presentation={presentation} incomingOnly />);

    const link = screen.getByTestId("wallet-history-hub-link");
    expect(link).toHaveAttribute("href", ONBOARDING_READ_ONLY_HISTORY_HREF);
    expect(screen.getByTestId("wallet-history")).toBeInTheDocument();
  });
});
