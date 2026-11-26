import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusinessHomeDoorCalculatorEntry } from "./BusinessHomeDoorCalculatorEntry";

describe("BusinessHomeDoorCalculatorEntry", () => {
  it("links to doors calculator", () => {
    render(<BusinessHomeDoorCalculatorEntry />);
    const link = screen.getByTestId("business-home-door-calculator");
    expect(link).toHaveAttribute("href", "/doors-calculator");
    expect(link).toHaveTextContent("Калькулятор дверей");
  });
});