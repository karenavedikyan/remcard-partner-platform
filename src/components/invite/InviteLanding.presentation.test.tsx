import { render, screen, within } from "@testing-library/react";
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

  it("shows the approved guest page: mechanic, terms, mutual offer and three steps", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "ОПТОВИК", partnerType: "COMPANY", city: "Краснодар" },
      intendedPartnerType: "MASTER",
      terms: [
        { category: "flooring", categoryLabel: "flooring", storePercent: 10, isExcluded: false },
        { category: "doors", categoryLabel: "Двери", storePercent: 15, isExcluded: true },
      ],
      note: "Давайте помогать друг другу находить новых клиентов!",
    });

    render(<InviteLanding token="test-token" />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "ОПТОВИК приглашает вас в партнёры",
    );
    expect(screen.getByText("Личное приглашение")).toBeInTheDocument();
    expect(screen.getByText("Компания · Краснодар")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Советуйте «ОПТОВИК» тем, с кем работаете на объекте: им скидка, вам вознаграждение.",
      ),
    ).toBeInTheDocument();

    const flow = within(screen.getByTestId("invite-flow"));
    expect(flow.getByRole("heading", { name: "Как это работает" })).toBeInTheDocument();
    expect(flow.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Выдаёте клиенту сертификат на скидку",
      "Клиент покупает у компании «ОПТОВИК»",
      "Вы получаете вознаграждение",
    ]);

    const terms = within(screen.getByTestId("invite-terms"));
    expect(terms.getByRole("heading", { name: "Условия компании «ОПТОВИК»" })).toBeInTheDocument();
    expect(terms.getByText("Напольные покрытия")).toBeInTheDocument();
    expect(terms.getByText("10%")).toBeInTheDocument();
    expect(terms.getByText(/Не участвуют: Двери/)).toBeInTheDocument();
    expect(
      terms.getByText("Общий процент — это скидка клиенту и ваше вознаграждение вместе."),
    ).toBeInTheDocument();
    expect(screen.queryByText("flooring")).not.toBeInTheDocument();
    expect(screen.queryByText(/MASTER/)).not.toBeInTheDocument();

    const mutual = within(screen.getByTestId("invite-mutual"));
    expect(mutual.getByRole("heading", { name: "Можно в обе стороны" })).toBeInTheDocument();
    expect(
      mutual.getByText(
        "ОПТОВИК может советовать вас своим клиентам. Укажите процент на свои услуги — и заказы пойдут к вам.",
      ),
    ).toBeInTheDocument();

    const note = within(screen.getByTestId("invite-note"));
    expect(note.getByText("Сообщение от компании «ОПТОВИК»")).toBeInTheDocument();
    expect(note.getByText("Давайте помогать друг другу находить новых клиентов!")).toBeInTheDocument();

    const next = within(screen.getByTestId("invite-next"));
    expect(next.getByRole("heading", { name: "Как стать партнёром" })).toBeInTheDocument();
    const steps = within(screen.getByTestId("invite-steps")).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Войдите или зарегистрируйтесь");
    expect(steps[0]).toHaveAttribute("data-state", "current");
    expect(steps[1]).toHaveTextContent("Примите условия");
    expect(steps[2]).toHaveTextContent("Назовите свой процент");
    expect(steps[2]).toHaveTextContent("Тогда ОПТОВИК начнёт приводить вам заказчиков.");

    const register = next.getByRole("link", { name: "Зарегистрироваться" });
    expect(register).toHaveAttribute("href", "/join?role=specialist&returnTo=%2Finvite%2Ftest-token");
    expect(next.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Finvite%2Ftest-token",
    );
    expect(
      next.getByText("Регистрация — ещё не согласие. Условия вы принимаете отдельно."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Принять условия/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("invite-dock")).not.toBeInTheDocument();
  });

  it("marks login as done and keeps decline and switch-account actions for a ready session", async () => {
    readySessionMocks();

    render(<InviteLanding token="test-token" />);

    const accept = await screen.findByRole("button", { name: "Принять условия" });
    expect(accept).toBeEnabled();
    const steps = within(screen.getByTestId("invite-steps")).getAllByRole("listitem");
    expect(steps[0]).toHaveAttribute("data-state", "done");
    expect(steps[1]).toHaveAttribute("data-state", "current");
    expect(screen.getByText("Условия зафиксированы в этом приглашении.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сменить аккаунт" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Зарегистрироваться" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Отклонить" }));
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Вы не приняли предложение",
    );
    expect(
      screen.getByText("Сотрудничество не начато. К условиям можно вернуться, пока ссылка активна."),
    ).toBeInTheDocument();
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalledWith(
      "/api/partnership/link-invite/accept",
      expect.anything(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Вернуться к условиям" }));
    expect(await screen.findByRole("button", { name: "Принять условия" })).toBeInTheDocument();
  });

  it("hides the mutual offer for an agent and stays neutral when the server may reverse sides", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "ОПТОВИК", partnerType: "STORE", city: "Краснодар" },
      intendedPartnerType: "AGENT",
      terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 15, isExcluded: false }],
      note: null,
    });
    const agent = render(<InviteLanding token="test-token" />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Приводите клиентов в «ОПТОВИК» и получайте процент",
    );
    expect(screen.getByText("Магазин · Краснодар")).toBeInTheDocument();
    expect(screen.queryByTestId("invite-mutual")).not.toBeInTheDocument();
    expect(screen.getByText("Отправьте клиенту сертификат")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Зарегистрироваться" })).toHaveAttribute(
      "href",
      "/join?role=agent&returnTo=%2Finvite%2Ftest-token",
    );
    agent.unmount();

    vi.mocked(remcardFetch).mockResolvedValue({
      status: "PENDING",
      inviter: { displayName: "Иван", partnerType: "MASTER", city: null },
      intendedPartnerType: "STORE",
      terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 15, isExcluded: false }],
      note: null,
    });
    render(<InviteLanding token="test-token" />);
    expect(await screen.findByTestId("invite-landing")).toHaveAttribute("data-direction", "neutral");
    expect(screen.queryByTestId("invite-mutual")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Условия предложения" })).toBeInTheDocument();
    expect(screen.queryByText(/Вы получаете вознаграждение/)).not.toBeInTheDocument();
    expect(screen.getByText("Откройте раздел «Партнёры»")).toBeInTheDocument();
  });
});
