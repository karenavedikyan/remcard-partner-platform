import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceivingAppealsBlocked } from "./ReceivingAppealsBlocked";

describe("P6.ReceivingAppealsBlocked", () => {
  it("renders honest receiving-side contract inventory", () => {
    render(<ReceivingAppealsBlocked />);
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Клиенты у меня" })).toBeTruthy();
    expect(screen.getByText(/BLK-RECEIVING-APPEALS/)).toBeTruthy();
    expect(screen.getAllByText(/client-appeals/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/BLK-OBSERVER-REFERRED/)).toBeNull();
  });
});
