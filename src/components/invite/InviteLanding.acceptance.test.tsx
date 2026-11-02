import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteLanding } from "./InviteLanding";
const mocks = vi.hoisted(() => ({
  api: vi.fn(), auth: vi.fn(), readiness: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/api-client", () => ({
  remcardFetch: mocks.api, getAuthMe: mocks.auth,
  RemcardApiError: class extends Error {
    constructor(public status: number, message: string, public body: Record<string, unknown> | null = null) { super(message); }
  },
}));
vi.mock("@/lib/auth-session", () => ({ fetchReadinessSafe: mocks.readiness }));
const { RemcardApiError } = await import("@/lib/api-client");
const preview = {
  status: "PENDING", inviter: { displayName: "Поставщик", partnerType: "STORE", city: "Краснодар" },
  intendedPartnerType: "AGENT", expiresAt: "2026-12-01T00:00:00Z", note: "Персональные условия",
  terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 12.5, isExcluded: false }],
};
function ready() {
  mocks.auth.mockResolvedValue({ user: { id: "owned-recipient", role: "PRO", displayName: "Получатель" } });
  mocks.readiness.mockResolvedValue({ ok: true, data: { canAccessCabinet: true, missingConsents: [],
    needsProfileOnboarding: false, needsProfileCompletion: false, nextStep: "cabinet", isEmployee: false, isAdmin: false } });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.mockReset().mockImplementation(async (_path, options) =>
    options?.method === "POST" ? { ok: true, redirect: "/partners?terms=owned-offer" } : preview);
  ready();
});
const posts = () => mocks.api.mock.calls.filter(([, options]) => options?.method === "POST");
describe("link recipient accepts without counteroffer or automatic terms editing", () => {
  it.each(["AGENT", "MASTER", "STORE", "COMPANY"])("%s: confirms only after POST and explicitly returns to partners", async type => {
    mocks.api.mockImplementation(async (_path, options) => options?.method === "POST"
      ? { ok: true, redirect: "/partners?terms=owned-offer" } : { ...preview, intendedPartnerType: type });
    render(<InviteLanding token="owned-invite" />);
    const accept = await screen.findByRole("button", { name: /Принять условия/ });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Изменить|Предложить|другие условия/ })).toBeNull();
    expect(posts()).toHaveLength(0);
    await userEvent.click(accept);
    const receipt = await screen.findByTestId("link-invite-accepted");
    expect(receipt).toHaveTextContent("Поставщик");
    expect(receipt).toHaveTextContent("12.5%");
    expect(posts()).toHaveLength(1);
    expect(posts()[0]![1].body).toEqual({ token: "owned-invite" });
    expect(mocks.router.replace).not.toHaveBeenCalled();
    await userEvent.click(within(receipt).getByRole("button", { name: "К партнёрам" }));
    expect(mocks.router.replace).toHaveBeenCalledWith("/partners");
  });
  it("guest keeps invite token through registration and sign-in with no accept POST", async () => {
    mocks.auth.mockResolvedValue({ user: null }); mocks.readiness.mockResolvedValue({ ok: false, error: "no-session" });
    render(<InviteLanding token="owned token" />);
    await screen.findByRole("button", { name: /Зарегистрироваться и продолжить/ });
    expect(screen.queryByRole("button", { name: /Принять условия/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Войти" }).getAttribute("href")).toContain("owned%2520token");
    expect(screen.getByRole("link", { name: /Зарегистрироваться и продолжить/ }).getAttribute("href")).toContain("owned%2520token");
    expect(posts()).toHaveLength(0);
  });
  it("declining is local and does not reject a reusable invite on the server", async () => {
    render(<InviteLanding token="owned-invite" />);
    await userEvent.click(await screen.findByRole("button", { name: "Не принимать" }));
    expect(await screen.findByRole("heading", { name: "Вы не приняли предложение" })).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });
  it("unconfirmed or failed responses cannot become a success; explicit retry is available", async () => {
    let first = true;
    mocks.api.mockImplementation(async (_path, options) => {
      if (options?.method !== "POST") return preview;
      if (first) { first = false; return { ok: false }; }
      return { ok: true };
    });
    render(<InviteLanding token="owned-invite" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    expect(await screen.findByText(/Не удалось принять приглашение/)).toBeInTheDocument();
    expect(screen.queryByTestId("link-invite-accepted")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Принять условия/ }));
    await screen.findByTestId("link-invite-accepted");
    expect(posts()).toHaveLength(2);
  });
  it("guards duplicate submission synchronously and ignores a detached result", async () => {
    let finish!: (value: unknown) => void;
    mocks.api.mockImplementation(async (_path, options) => options?.method === "POST"
      ? new Promise(resolve => { finish = resolve; }) : preview);
    const view = render(<InviteLanding token="owned-invite" />);
    const accept = await screen.findByRole("button", { name: /Принять условия/ });
    fireEvent.click(accept); fireEvent.click(accept);
    expect(posts()).toHaveLength(1);
    view.unmount(); finish({ ok: true, redirect: "/partners" });
    await waitFor(() => expect(mocks.router.replace).not.toHaveBeenCalled());
  });
  it("existing partnership link never opens a change editor", async () => {
    mocks.api.mockImplementation(async (_path, options) => {
      if (options?.method === "POST") throw new RemcardApiError(409, "Partnership already exists", { code: "PARTNERSHIP_ALREADY_ACTIVE", partnershipId: "owned-existing" });
      return preview;
    });
    render(<InviteLanding token="owned-invite" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    expect((await screen.findByRole("link", { name: /Открыть существующее партнёрство/ })).getAttribute("href")).toBe("/partners");
    expect(screen.queryByTestId("link-invite-accepted")).toBeNull();
  });
  it("expired session returns to authentication, not a false acceptance", async () => {
    mocks.api.mockImplementation(async (_path, options) => {
      if (options?.method === "POST") {
        mocks.auth.mockResolvedValue({ user: null });
        mocks.readiness.mockResolvedValue({ ok: false, error: "no-session" });
        throw new RemcardApiError(401, "Unauthorized", { error: "Unauthorized" });
      }
      return preview;
    });
    render(<InviteLanding token="owned-invite" />);
    await userEvent.click(await screen.findByRole("button", { name: /Принять условия/ }));
    await screen.findByRole("button", { name: /Зарегистрироваться и продолжить/ });
    expect(screen.queryByTestId("link-invite-accepted")).toBeNull();
    expect(posts()).toHaveLength(1);
  });
});
