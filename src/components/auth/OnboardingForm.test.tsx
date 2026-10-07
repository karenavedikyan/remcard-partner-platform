import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingForm } from "./OnboardingForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api-client", () => ({
  getAuthMe: vi.fn(),
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    body: { error?: string; errorCode?: string } | null;
    constructor(status: number, message: string, body: { error?: string } | null = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock("@/lib/auth-session", () => ({
  consentRequirementKey: (req: { kind: string; legalDocumentId: string | null }) =>
    `${req.kind}:${req.legalDocumentId ?? ""}`,
  fetchAuthMeSafe: vi.fn(async () => ({
    ok: true as const,
    data: { user: { id: "c1", role: "PRO" } },
  })),
  fetchReadinessSafe: vi.fn(),
}));

import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import { fetchReadinessSafe } from "@/lib/auth-session";

const profileReady = {
  nextStep: "ready" as const,
  missingConsents: [],
  needsProfileOnboarding: false,
  canAccessCabinet: true,
  isEmployee: false,
  isAdmin: false,
};

const needsProfile = {
  nextStep: "profile" as const,
  missingConsents: [
    {
      kind: "PUBLIC_OFFER_PRO",
      legalDocumentId: "offer-1",
      version: "1.0",
      url: "/legal/public-offer-pro",
      status: "missing" as const,
    },
  ],
  needsProfileOnboarding: true,
  canAccessCabinet: false,
  isEmployee: false,
  isAdmin: false,
};

describe("OnboardingForm", () => {
  let savedDisplayName: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    savedDisplayName = null;
    vi.mocked(fetchReadinessSafe).mockResolvedValue({ ok: true, data: needsProfile });
    vi.mocked(getAuthMe).mockImplementation(async () => ({
      user: { id: "c1", role: "PRO", displayName: savedDisplayName },
    }));
    vi.mocked(remcardFetch).mockImplementation(async (path, options) => {
      if (path === "/api/auth/me" && options?.method === "PATCH") {
        savedDisplayName = (options.body as { displayName: string }).displayName;
        return { user: { id: "c1", role: "PRO", displayName: savedDisplayName } };
      }
      if (path === "/api/pro/profile" && options?.method === "PATCH") {
        return { user: { id: "c1", role: "PRO", partnerType: "STORE" } };
      }
      if (path === "/api/account/consent") {
        return { ok: true };
      }
      return { ok: true };
    });
  });

  async function fillStoreForm(ui: ReturnType<typeof userEvent.setup>) {
    await ui.click(screen.getByRole("radio", { name: /магазин/i }));
    await ui.type(screen.getByLabelText(/город работы/i), "Краснодар");
    await ui.type(screen.getByLabelText(/название магазина/i), "Магазин Тест");
    await ui.click(screen.getByRole("checkbox", { name: /двери/i }));
    await ui.click(screen.getByRole("checkbox", { name: /публичную оферту/i }));
  }

  it("saves displayName via PATCH /api/auth/me for STORE", async () => {
    const ui = userEvent.setup();
    render(<OnboardingForm returnTo="/scanner" />);
    await screen.findByText(/регистрация партнёра/i);
    await fillStoreForm(ui);
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/auth/me", {
        method: "PATCH",
        body: { displayName: "Магазин Тест" },
      });
      expect(remcardFetch).toHaveBeenCalledWith(
        "/api/pro/profile",
        expect.objectContaining({
          method: "PATCH",
          body: expect.not.objectContaining({ displayName: expect.anything() }),
        }),
      );
    });
  });

  it("preserves user-edited displayName when delayed auth/me returns stale value", async () => {
    let resolveMe: ((name: string | null) => void) | undefined;
    const meDeferred = new Promise<{ user: { displayName: string | null } }>((resolve) => {
      resolveMe = (name) => resolve({ user: { displayName: name } });
    });
    vi.mocked(getAuthMe).mockReturnValue(meDeferred);

    const ui = userEvent.setup();
    render(<OnboardingForm returnTo="/scanner" initialDisplayName="" />);
    await screen.findByText(/регистрация партнёра/i);
    await ui.click(screen.getByRole("radio", { name: /магазин/i }));

    const nameInput = screen.getByLabelText(/название магазина/i);
    await ui.type(nameInput, "Новое название");
    expect(nameInput).toHaveValue("Новое название");

    resolveMe!("Старое из API");
    await waitFor(() => expect(getAuthMe).toHaveBeenCalled());
    expect(nameInput).toHaveValue("Новое название");
  });

  it("uses initialDisplayName without async overwrite when provided", async () => {
    let resolveMe: ((name: string | null) => void) | undefined;
    const meDeferred = new Promise<{ user: { displayName: string | null } }>((resolve) => {
      resolveMe = (name) => resolve({ user: { displayName: name } });
    });
    vi.mocked(getAuthMe).mockReturnValue(meDeferred);

    const ui = userEvent.setup();
    render(<OnboardingForm returnTo="/scanner" initialDisplayName="С сервера" />);
    await screen.findByText(/регистрация партнёра/i);
    await ui.click(screen.getByRole("radio", { name: /магазин/i }));

    const nameInput = screen.getByLabelText(/название магазина/i);
    await ui.clear(nameInput);
    await ui.type(nameInput, "Пользовательское");
    resolveMe!("Старое из API");
    await new Promise((r) => setTimeout(r, 50));
    expect(nameInput).toHaveValue("Пользовательское");
  });

  it("retries verification without second profile PATCH after partial success", async () => {
    let readinessCalls = 0;
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      if (readinessCalls <= 2) {
        return { ok: true, data: needsProfile };
      }
      if (readinessCalls === 3) {
        return { ok: false, kind: "server" as const, status: 503, message: "Service unavailable" };
      }
      return { ok: true, data: profileReady };
    });

    const ui = userEvent.setup();
    render(<OnboardingForm returnTo="/scanner" />);
    await screen.findByText(/регистрация партнёра/i);
    await fillStoreForm(ui);
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    expect(await screen.findByText(/повторите проверку/i)).toBeInTheDocument();

    const profileCalls = vi
      .mocked(remcardFetch)
      .mock.calls.filter(([path, opts]) => path === "/api/pro/profile" && opts?.method === "PATCH");
    expect(profileCalls.length).toBe(1);

    await ui.click(screen.getByRole("button", { name: /повторить проверку/i }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/scanner");
    });
    expect(
      vi
        .mocked(remcardFetch)
        .mock.calls.filter(([path, opts]) => path === "/api/pro/profile" && opts?.method === "PATCH")
        .length,
    ).toBe(1);
  });

  it("session recovery link passes final returnTo without onboarding wrapper", async () => {
    let readinessCalls = 0;
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      if (readinessCalls <= 2) return { ok: true, data: needsProfile };
      return { ok: false, kind: "unauthorized" as const };
    });

    const ui = userEvent.setup();
    render(<OnboardingForm returnTo="/scanner" />);
    await screen.findByText(/регистрация партнёра/i);
    await fillStoreForm(ui);
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    const loginLink = await screen.findByRole("link", { name: /войти снова/i });
    expect(loginLink.getAttribute("href")).toBe("/login?reason=session&returnTo=%2Fscanner");
    expect(loginLink.getAttribute("href")).not.toContain("onboarding");
  });

  it("rejects unsafe returnTo in session recovery link", async () => {
    let readinessCalls = 0;
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      if (readinessCalls <= 2) return { ok: true, data: needsProfile };
      return { ok: false, kind: "unauthorized" as const };
    });

    const ui = userEvent.setup();
    render(<OnboardingForm returnTo="https://evil.test" />);
    await screen.findByText(/регистрация партнёра/i);
    await fillStoreForm(ui);
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    const loginLink = await screen.findByRole("link", { name: /войти снова/i });
    expect(loginLink.getAttribute("href")).toBe("/login?reason=session");
    expect(loginLink.getAttribute("href")).not.toContain("evil");
  });
});
