import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscussionInviteLanding } from "./DiscussionInviteLanding";

const push = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  getAuthMe: vi.fn(),
  RemcardApiError: class extends Error {},
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
}));

const { remcardFetch, getAuthMe } = await import("@/lib/api-client");

function preview(inviter: Record<string, unknown>) {
  return {
    status: "PENDING",
    viewerRole: "anonymous",
    canJoin: true,
    inviter,
    recipientLabel: "Салон дверей",
    cooperationSubject: "Хочу рекомендовать ваши двери клиентам",
  };
}

describe("DiscussionInviteLanding presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthMe).mockResolvedValue({ user: null } as never);
  });

  it("explains the agent mechanic and the three steps when the server marks an agent", async () => {
    vi.mocked(remcardFetch).mockResolvedValue(
      preview({ displayName: "Алексей Романов", partnerType: null, city: "Краснодар", isAgent: true }),
    );

    render(<DiscussionInviteLanding token="tok" />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Алексей Романов хочет приводить вам клиентов",
    );
    expect(screen.getByText("Агент · Краснодар")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("invite-flow"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Алексей Романов выдаёт клиенту сертификат",
      "Клиент покупает у вас со скидкой",
      "Вы платите процент с покупки",
    ]);
    const steps = within(screen.getByTestId("invite-steps")).getAllByRole("listitem");
    expect(steps.map((step) => step.querySelector("strong")?.textContent)).toEqual([
      "Войдите или зарегистрируйтесь",
      "Присоединитесь к обсуждению",
      "Согласуйте процент",
    ]);
    expect(screen.getByText("Процент пока не согласован: его предлагаете вы.")).toBeInTheDocument();
    expect(screen.getByText("Хочу рекомендовать ваши двери клиентам")).toBeInTheDocument();
    expect(screen.queryByTestId("invite-terms")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invite-mutual")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Присоединиться к обсуждению" }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(String(push.mock.calls[0]?.[0])).toContain("%2Finvite%2Fdiscussion%2Ftok");
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalledWith(
      "/api/partnership/discussion-invite/join",
      expect.anything(),
    );
  });

  it("stays neutral for other senders and for servers that do not send the agent mark", async () => {
    for (const inviter of [
      { displayName: "Иван", partnerType: "MASTER", city: null, isAgent: false },
      { displayName: "Иван", partnerType: "MASTER", city: null },
    ]) {
      vi.mocked(remcardFetch).mockResolvedValue(preview(inviter));
      const view = render(<DiscussionInviteLanding token="tok" />);
      expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
        "Иван приглашает обсудить сотрудничество",
      );
      expect(screen.getByTestId("discussion-invite-landing")).toHaveAttribute(
        "data-from-agent",
        "false",
      );
      expect(screen.queryByText(/Вы платите процент/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Присоединиться к обсуждению" })).toBeEnabled();
      view.unmount();
    }
  });
});
