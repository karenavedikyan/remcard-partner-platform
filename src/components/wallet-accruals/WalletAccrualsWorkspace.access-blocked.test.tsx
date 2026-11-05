import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletAccrualsWorkspace } from "./WalletAccrualsWorkspace";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn(() => false),
}));

import { fetchSettlements } from "@/lib/settlements-loader";

describe("WalletAccrualsWorkspace accessBlockedMessage", () => {
  it("does not call settlements API when ledger read is blocked upfront", async () => {
    render(
      <WalletAccrualsWorkspace
        scopeKey="test-scope"
        accessBlockedMessage="Нет права «Просмотр расчётов»."
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Нет права «Просмотр расчётов»/)).toBeInTheDocument();
    });
    expect(fetchSettlements).not.toHaveBeenCalled();
  });
});
