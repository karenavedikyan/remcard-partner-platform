import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DoorCalculatorUnavailable } from "./DoorCalculatorUnavailable";

describe("DoorCalculatorUnavailable", () => {
  it("shows neutral unavailable copy", () => {
    render(<DoorCalculatorUnavailable />);
    expect(screen.getByTestId("door-calculator-unavailable")).toHaveTextContent(
      "Раздел недоступен для вашего профиля",
    );
  });
});