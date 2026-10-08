import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InviteLanding } from "./InviteLanding";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  getAuthMe: vi.fn().mockResolvedValue({ user: null }),
  RemcardApiError: class extends Error {},
}));

vi.mock("@/lib/auth-session", () => ({
  fetchReadinessSafe: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const { remcardFetch } = await import("@/lib/api-client");

describe("InviteLanding presentation", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "ОПТОВИК", partnerType: "STORE", city: "Краснодар" },
      intendedPartnerType: null,
      terms: [
        { category: "flooring", categoryLabel: "flooring", storePercent: 10, isExcluded: false },
      ],
      note: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  it("shows role-aware hero, Russian categories, and guest CTA before terms copy", async () => {
    render(<InviteLanding token="test-token" />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      /Сотрудничайте с ОПТОВИК через RemCard PROF/,
    );
    expect(screen.getByText(/Для специалистов/)).toBeInTheDocument();
    expect(screen.getByText(/Напольные покрытия/)).toBeInTheDocument();
    expect(screen.queryByText("flooring")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Зарегистрироваться и продолжить/ })).toBeInTheDocument();
    expect(screen.getByText(/Уже есть аккаунт/)).toBeInTheDocument();
    expect(screen.queryByText(/MASTER/)).not.toBeInTheDocument();
  });
});
