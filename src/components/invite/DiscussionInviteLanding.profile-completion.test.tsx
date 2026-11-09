import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscussionInviteLanding } from "./DiscussionInviteLanding";
import { remcardFetch, getAuthMe } from "@/lib/api-client";

const push = vi.fn();
const replace = vi.fn();

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
    getAuthMe: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
}));

const previewPending = {
  status: "PENDING",
  viewerRole: "guest",
  inviteId: "disc-1",
  canJoin: true,
  inviter: { displayName: "Агент", partnerType: "COMPANY", city: "Краснодар" },
};

describe("DiscussionInviteLanding profile completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockReset();
    replace.mockReset();
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "T", publicId: "RC-1" },
    } as never);
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/discussion-invite/public/")) return previewPending;
      if (url === "/api/partnership/discussion-invite/join" && init?.method === "POST") {
        return { ok: true, inviteId: "disc-1" };
      }
      if (url === "/api/pro/partner-type/switch") {
        return {
          currentKind: "specialist",
          isEmployee: false,
          publicId: "RC-1",
          options: [],
          setupRecovery: {
            needed: true,
            targetKind: "specialist",
            requiredFields: ["serviceSpecializationIds"],
            prefill: {
              publicName: "Мастер",
              city: "Краснодар",
              serviceSpecializationIds: [],
              productCategoryIds: [],
              organizationName: "",
            },
          },
        };
      }
      return previewPending;
    });
  });

  it("redirects immediately to profile when recovery needed after join", async () => {
    render(<DiscussionInviteLanding token="d-tok" />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Присоединиться к обсуждению/ }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const href = replace.mock.calls[0]?.[0] as string;
    expect(href).toContain("focus=partnerType");
    expect(href).toContain("inviteAcceptedContext=discussion");
    expect(screen.queryByTestId("invite-accepted-profile-prompt")).toBeNull();
  });

  it("does not navigate after unmount during delayed auth", async () => {
    let resolveMe: (value: { user: { id: string } | null }) => void = () => {};
    vi.mocked(getAuthMe).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMe = resolve;
        }),
    );
    const { unmount } = render(<DiscussionInviteLanding token="d-tok" />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Присоединиться к обсуждению/ }),
    );
    unmount();
    await act(async () => {
      resolveMe({ user: { id: "u1" } });
      await Promise.resolve();
    });
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(
      vi.mocked(remcardFetch).mock.calls.some(
        (c) => c[0] === "/api/partnership/discussion-invite/join",
      ),
    ).toBe(false);
  });

  it("does not navigate after unmount during slow join POST", async () => {
    let resolveJoin: (value: { ok: boolean; inviteId: string }) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/discussion-invite/public/")) return previewPending;
      if (url === "/api/partnership/discussion-invite/join" && init?.method === "POST") {
        return new Promise((resolve) => {
          resolveJoin = resolve;
        });
      }
      if (url === "/api/pro/partner-type/switch") {
        return { currentKind: "specialist", isEmployee: false, publicId: "RC-1", options: [] };
      }
      throw new Error(url);
    });
    const { unmount } = render(<DiscussionInviteLanding token="d-tok" />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Присоединиться к обсуждению/ }),
    );
    unmount();
    await act(async () => {
      resolveJoin({ ok: true, inviteId: "disc-1" });
      await Promise.resolve();
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("retries GET only after join and readiness failure", async () => {
    let switchCalls = 0;
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/discussion-invite/public/")) return previewPending;
      if (url === "/api/partnership/discussion-invite/join" && init?.method === "POST") {
        return { ok: true, inviteId: "disc-1" };
      }
      if (url === "/api/pro/partner-type/switch") {
        switchCalls += 1;
        if (switchCalls === 1) throw new (await import("@/lib/api-client")).RemcardApiError(503, "down");
        return { currentKind: "specialist", isEmployee: false, publicId: "RC-1", options: [] };
      }
      return previewPending;
    });
    render(<DiscussionInviteLanding token="d-tok" />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Присоединиться к обсуждению/ }),
    );
    expect(await screen.findByTestId("invite-accepted-profile-prompt")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("invite-accept-profile-check-retry"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partners?discussion=disc-1"));
    expect(switchCalls).toBe(2);
  });

  it("exempts employees from setup redirect", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (url: string, init?: { method?: string }) => {
      if (url.includes("/discussion-invite/public/")) return previewPending;
      if (url === "/api/partnership/discussion-invite/join" && init?.method === "POST") {
        return { ok: true, inviteId: "disc-1" };
      }
      if (url === "/api/pro/partner-type/switch") {
        return { currentKind: "specialist", isEmployee: true, publicId: "RC-1", options: [] };
      }
      return previewPending;
    });
    render(<DiscussionInviteLanding token="d-tok" />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Присоединиться к обсуждению/ }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partners?discussion=disc-1"));
  });
});
