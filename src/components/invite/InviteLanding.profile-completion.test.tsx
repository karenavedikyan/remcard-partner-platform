import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteLanding } from "./InviteLanding";
import { RemcardApiError, remcardFetch, getAuthMe } from "@/lib/api-client";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
    getAuthMe: vi.fn(),
  };
});

vi.mock("@/lib/auth-session", () => ({
  fetchReadinessSafe: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh }),
}));

const { fetchReadinessSafe } = await import("@/lib/auth-session");

const previewPending = {
  status: "PENDING",
  inviter: { displayName: "ОПТОВИК", partnerType: "STORE", city: "Краснодар" },
  intendedPartnerType: "specialist",
  terms: [{ category: "paint", categoryLabel: "Краски", storePercent: 10, isExcluded: false }],
  note: null,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

function readySession() {
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
}

describe("InviteLanding profile completion after accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replace.mockReset();
    refresh.mockReset();
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return { ok: true, redirect: "/partners?terms=p-99" };
      }
      if (url === "/api/pro/partner-type/switch") {
        return {
          currentKind: "agent",
          isEmployee: false,
          publicId: "RC-1",
          options: [],
          setupRecovery: {
            needed: true,
            targetKind: "agent",
            requiredFields: ["publicName", "city"],
            prefill: {
              publicName: "Агент",
              city: "Краснодар",
              serviceSpecializationIds: [],
              productCategoryIds: [],
              organizationName: "",
            },
          },
        };
      }
      throw new Error(`unexpected ${url}`);
    });
    readySession();
  });

  it("redirects immediately to profile setup when recovery needed", async () => {
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const href = replace.mock.calls[0]?.[0] as string;
    expect(href).toContain("/profile?");
    expect(href).toContain("focus=partnerType");
    expect(href).toContain("inviteAcceptedContext=partnership");
    expect(screen.queryByTestId("invite-accepted-profile-prompt")).toBeNull();
  });

  it("navigates on replay with ok:true without second POST", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return { ok: true, redirect: "/partners?terms=replay" };
      }
      if (url === "/api/pro/partner-type/switch") {
        return { currentKind: "agent", isEmployee: false, publicId: "RC-1", options: [] };
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partners?terms=replay"));
  });

  it("does not treat malformed accept payload as success", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return {};
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    expect(await screen.findByText(/Не удалось принять приглашение/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("honors explicit auth redirect without accepted state", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return { ok: false, redirect: "/login?reason=session&returnTo=%2Finvite%2Ftok" };
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?reason=session&returnTo=%2Finvite%2Ftok"),
    );
    expect(screen.queryByTestId("invite-accepted-profile-prompt")).toBeNull();
  });

  it.each([
    ["PARTNERSHIP_ALREADY_ACTIVE", 409],
    ["PARTNERSHIP_EXISTS", 400],
  ] as const)("ignores returnTo on %s conflict (%s)", async (code, status) => {
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        throw new RemcardApiError(status, "Конфликт партнёрства", {
          error: "Конфликт партнёрства",
          code,
          partnershipId: "p-existing",
          returnTo: "/invite/tok",
        });
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    expect(await screen.findByText(/Конфликт партнёрства/i)).toBeInTheDocument();
    expect(
      vi.mocked(remcardFetch).mock.calls.some((c) => c[0] === "/api/pro/partner-type/switch"),
    ).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("invite-accepted-profile-prompt")).toBeNull();
  });

  it("shows accepted retry UI and redirects on GET retry when complete", async () => {
    let switchCalls = 0;
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return { ok: true, redirect: "/partners" };
      }
      if (url === "/api/pro/partner-type/switch") {
        switchCalls += 1;
        if (switchCalls === 1) throw new RemcardApiError(503, "Сервис недоступен");
        return { currentKind: "agent", isEmployee: false, publicId: "RC-1", options: [] };
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    expect(await screen.findByTestId("invite-accepted-profile-prompt")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("invite-accept-profile-check-retry"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partners"));
    expect(switchCalls).toBe(2);
  });

  it("treats malformed switch GET as retryable error after accept", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return { ok: true, redirect: "/partners" };
      }
      if (url === "/api/pro/partner-type/switch") {
        return { isEmployee: false, options: [] };
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    expect(await screen.findByTestId("invite-accept-profile-check-error")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not navigate after unmount during slow accept", async () => {
    let resolveAccept: (value: { ok: boolean; redirect: string }) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        return new Promise((resolve) => {
          resolveAccept = resolve;
        });
      }
      if (url === "/api/pro/partner-type/switch") {
        return { currentKind: "agent", isEmployee: false, publicId: "RC-1", options: [] };
      }
      throw new Error(`unexpected ${url}`);
    });
    const { unmount } = render(<InviteLanding token="tok" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    unmount();
    await act(async () => {
      resolveAccept({ ok: true, redirect: "/partners" });
      await Promise.resolve();
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores duplicate accept clicks in the same tick", async () => {
    let acceptCalls = 0;
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/link-invite/public/")) return previewPending;
      if (url === "/api/partnership/link-invite/accept" && init?.method === "POST") {
        acceptCalls += 1;
        await new Promise((r) => setTimeout(r, 50));
        return { ok: true, redirect: "/partners" };
      }
      if (url === "/api/pro/partner-type/switch") {
        return { currentKind: "agent", isEmployee: false, publicId: "RC-1", options: [] };
      }
      throw new Error(`unexpected ${url}`);
    });
    render(<InviteLanding token="tok" />);
    const accept = await screen.findByRole("button", { name: /Принять условия/ });
    await userEvent.click(accept);
    await userEvent.click(accept);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(acceptCalls).toBe(1);
  });
});
