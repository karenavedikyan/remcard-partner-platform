import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const { remcardFetch, getAuthMe } = await import("@/lib/api-client");
const { fetchReadinessSafe } = await import("@/lib/auth-session");

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
    vi.mocked(getAuthMe).mockResolvedValue({ user: null } as never);
    vi.mocked(fetchReadinessSafe).mockResolvedValue({ ok: false, error: "no-session" } as never);
  });

  it("blocks accept and renders safely when participating terms are malformed", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "ОПТОВИК", partnerType: "STORE", city: "Краснодар" },
      intendedPartnerType: null,
      terms: [null, { category: "x", isExcluded: false }],
      note: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "Test", publicId: "RC-1" },
    } as never);
    vi.mocked(fetchReadinessSafe).mockResolvedValue({
      ok: true,
      data: {
        canAccessCabinet: true,
        needsProfileOnboarding: false,
        needsProfileCompletion: false,
        nextStep: "cabinet",
        missingConsents: [],
        isEmployee: false,
        isAdmin: false,
      },
    } as never);

    render(<InviteLanding token="test-token" />);

    expect(await screen.findByText(/Условия предложения недоступны/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Принять условия/ })).toBeDisabled();
  });

  const readySessionMocks = () => {
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "Test", publicId: "RC-1" },
    } as never);
    vi.mocked(fetchReadinessSafe).mockResolvedValue({
      ok: true,
      data: {
        canAccessCabinet: true,
        needsProfileOnboarding: false,
        needsProfileCompletion: false,
        nextStep: "cabinet",
        missingConsents: [],
        isEmployee: false,
        isAdmin: false,
      },
    } as never);
  };

  it("blocks accept for mixed valid and unknown terms without posting accept", async () => {
    const valid10 = {
      category: "plumbing",
      categoryLabel: "Сантехника",
      storePercent: 10,
      isExcluded: false,
    };
    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "ОПТОВИК", partnerType: "STORE", city: "Краснодар" },
      intendedPartnerType: null,
      terms: [valid10, null],
      note: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    readySessionMocks();

    render(<InviteLanding token="test-token" />);

    expect(await screen.findByText(/Условия предложения недоступны/)).toBeInTheDocument();
    const acceptBtn = screen.getByRole("button", { name: /Принять условия/ });
    expect(acceptBtn).toBeDisabled();
    await userEvent.click(acceptBtn);
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalledWith(
      "/api/partnership/link-invite/accept",
      expect.anything(),
    );
  });

  it("blocks accept when terms are hidden but session is ready", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "ОПТОВИК", partnerType: "STORE", city: "Краснодар" },
      intendedPartnerType: null,
      terms: undefined,
      note: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    readySessionMocks();

    render(<InviteLanding token="test-token" />);

    expect(await screen.findByText(/Условия предложения недоступны/)).toBeInTheDocument();
    const acceptBtn = screen.getByRole("button", { name: /Принять условия/ });
    expect(acceptBtn).toBeDisabled();
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
