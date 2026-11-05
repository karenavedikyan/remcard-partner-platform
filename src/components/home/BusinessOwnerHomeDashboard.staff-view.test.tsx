import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessOwnerHomeDashboard } from "./BusinessOwnerHomeDashboard";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
}));

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
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalled();
  });
});
