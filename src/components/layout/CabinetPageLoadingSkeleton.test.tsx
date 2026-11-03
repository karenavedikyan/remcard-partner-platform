import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CabinetPageLoadingSkeleton } from "@/components/layout/CabinetPageLoadingSkeleton";

describe("CabinetPageLoadingSkeleton", () => {
  it("keeps static route heading visible and exposes busy status semantics", () => {
    render(
      <CabinetPageLoadingSkeleton
        eyebrow="RemCard PROF"
        title="Клиенты"
        description="Клиенты, с которыми вы работаете в кабинете."
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Клиенты" })).toBeInTheDocument();
    expect(screen.getByText("RemCard PROF")).toBeInTheDocument();
    expect(screen.getByText(/Клиенты, с которыми вы работаете/i)).toBeInTheDocument();
  });
});
