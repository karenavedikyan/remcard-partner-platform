import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessOwnerHomeDashboard } from "./BusinessOwnerHomeDashboard";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(() => Promise.resolve({ partnerships: [] })),
  };
});

vi.mock("@/components/profile/ProfileBranchContextSwitcher", () => ({
  ProfileBranchContextSwitcher: () => <div data-testid="branch-switcher" />,
}));

describe("BusinessOwnerHomeDashboard org-staff-view", () => {
  it("uses the same business home chrome without owner metrics fetch", async () => {
    const { remcardFetch } = await import("@/lib/api-client");
    render(
      <BusinessOwnerHomeDashboard partnerType="STORE" homeAccessMode="org-staff-view" />,
    );
    expect(screen.getByRole("heading", { name: /Начните с продажи/i })).toBeTruthy();
    expect(screen.getByText("Продажи сегодня")).toBeTruthy();
    expect(screen.getByText("С чего начать")).toBeTruthy();
    expect(screen.getByText("Ничего лишнего на старте")).toBeTruthy();
    expect(screen.queryByText(/Разделы/i)).toBeNull();
  });

  it("shows door calculator entry for org staff when enabled", () => {
    render(
      <BusinessOwnerHomeDashboard
        partnerType="COMPANY"
        homeAccessMode="org-staff-view"
        showDoorCalculatorEntry
      />,
    );
    expect(screen.getByTestId("business-home-door-calculator-block")).toBeTruthy();
    expect(screen.getByTestId("business-home-door-calculator")).toHaveAttribute(
      "href",
      "/doors-calculator",
    );
  });

  it("hides door calculator entry without flag", () => {
    render(
      <BusinessOwnerHomeDashboard partnerType="STORE" homeAccessMode="org-staff-view" />,
    );
    expect(screen.queryByTestId("business-home-door-calculator-block")).toBeNull();
  });
});
