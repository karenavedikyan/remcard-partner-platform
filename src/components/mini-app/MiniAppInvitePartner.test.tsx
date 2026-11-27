import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiniAppInvitePartner } from "./MiniAppInvitePartner";
import * as api from "@/lib/mini-app/api";
import { RemcardApiError } from "@/lib/api-client";
import {
  clearMiniInviteRecoveryGuard,
  miniInviteRecoveryKey,
} from "@/lib/mini-app/invite-wizard";

vi.mock("@/lib/config", () => ({ getAppUrl: () => "https://prof.remcard.ru" }));

vi.mock("@/lib/mini-app/api", () => ({
  miniAppFetchInviteContext: vi.fn(),
  miniAppCreateDiscussionInvite: vi.fn(),
  miniAppCreateLinkInvite: vi.fn(),
}));

const baseProps = {
  actorUserId: "test-actor",
  platform: "telegram" as const,
  branchId: null,
  embeddedContext: "default" as const,
  partnersSearchUrl: "https://prof.remcard.ru/partners",
  onBack: vi.fn(),
  onOpenLink: vi.fn(),
};

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

describe("MiniAppInvitePartner wizard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearMiniInviteRecoveryGuard(
      miniInviteRecoveryKey({
        actorUserId: baseProps.actorUserId,
        embeddedContext: baseProps.embeddedContext,
        platform: baseProps.platform,
        branchId: baseProps.branchId,
        kind: "discussion",
      }),
    );
    vi.mocked(api.miniAppFetchInviteContext).mockReset();
    vi.mocked(api.miniAppCreateDiscussionInvite).mockReset();
    vi.mocked(api.miniAppCreateLinkInvite).mockReset();
    baseProps.onBack.mockReset();
    baseProps.onOpenLink.mockReset();
    vi.stubGlobal("confirm", () => true);
    mockClipboard(vi.fn().mockRejectedValue(new Error("no clipboard")));
  });

  it("shows blocking screen when invite context denies access", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockRejectedValue(
      new RemcardApiError(403, "Нет доступа"),
    );
    render(<MiniAppInvitePartner {...baseProps} />);
    expect(await screen.findByTestId("mini-invite-blocked")).toHaveTextContent("Нет доступа");
  });

  it("walks agent discussion flow through three steps and copies invitation", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    vi.mocked(api.miniAppCreateDiscussionInvite).mockResolvedValue({
      inviteId: "d1",
      token: "tok",
      expiresAt: "2099-01-01T00:00:00.000Z",
      previewPath: "/invite/discussion/tok",
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");

    await user.type(screen.getByTestId("mini-invite-name"), "Дом материалов");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByTestId("mini-invite-create"));

    await waitFor(() => expect(screen.getByTestId("invite-ready")).toBeInTheDocument());
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledWith(
      "telegram",
      expect.objectContaining({
        recipientLabel: "Дом материалов",
        cooperationSubject: expect.any(String),
      }),
      expect.any(Object),
    );
    const inviteUrl = "https://prof.remcard.ru/invite/discussion/tok";
    expect(screen.getByRole("heading", { name: "Приглашение создано" })).toBeInTheDocument();
    expect(screen.getByText("Что будет после передачи приглашения")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Открыть карточку приглашения" }));
    expect(baseProps.onOpenLink).toHaveBeenCalledWith(inviteUrl);
    await user.click(screen.getByRole("button", { name: "Поделиться приглашением" }));
    expect(screen.getByRole("textbox", { name: "Ссылка" })).toHaveValue(inviteUrl);
    mockClipboard(writeText);
    await user.click(screen.getByRole("button", { name: "Скопировать ссылку", exact: true }));
    expect(writeText).toHaveBeenLastCalledWith(inviteUrl);
    expect(screen.getByRole("status")).toHaveTextContent("Ссылка скопирована");
    await user.click(screen.getByRole("button", { name: "Скопировать текст" }));
    expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/^.+\n\nhttps:\/\/prof\.remcard\.ru\/invite\/discussion\/tok$/s));
    expect(screen.getByRole("status")).toHaveTextContent("Текст приглашения скопирован");
  });

  it("preserves the message when the terms arrive after opening the review step", async () => {
    const initial = {
      kind: "terms" as const,
      nameMaxLength: 120,
      noteMaxLength: 400,
      inviterBusinessSide: {
        principalUserId: "store-1",
        partnerType: "STORE" as const,
        storeCategories: ["doors"],
        specializations: [],
        tradeTermCategories: ["doors"],
      },
      categoryPlan: { categories: ["doors"], requiresIntendedType: false },
    };
    let resolveTerms!: (value: typeof initial) => void;
    vi.mocked(api.miniAppFetchInviteContext)
      .mockResolvedValueOnce(initial)
      .mockReturnValueOnce(new Promise((resolve) => { resolveTerms = resolve; }));
    vi.mocked(api.miniAppCreateLinkInvite).mockResolvedValue({
      inviteId: "l1",
      token: "ltok",
      expiresAt: "2099-06-01T00:00:00.000Z",
      previewPath: "/invite/ltok",
    });
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");

    await user.type(screen.getByTestId("mini-invite-name"), "Мастер Иван");
    await user.selectOptions(screen.getByTestId("mini-invite-type"), "MASTER");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    fireEvent.change(screen.getByTestId("mini-invite-note"), {
      target: { value: "Приглашаю к сотрудничеству" },
    });
    await user.click(screen.getByTestId("mini-invite-next-2"));
    expect(screen.getByTestId("mini-invite-create")).toBeDisabled();
    await act(async () => resolveTerms({
      ...initial,
      categoryPlan: { categories: ["doors", "plumbing"], requiresIntendedType: false },
    }));
    expect(screen.getByTestId("invite-review-message")).toHaveTextContent("Приглашаю к сотрудничеству");
    await user.click(screen.getByTestId("mini-invite-create"));

    await waitFor(() => expect(api.miniAppCreateLinkInvite).toHaveBeenCalled());
    const body = vi.mocked(api.miniAppCreateLinkInvite).mock.calls[0]![1];
    expect(body.intendedPartnerType).toBe("MASTER");
    expect(body.terms).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "doors", storePercent: 10 })]),
    );
  });

  it("disables double submit while create is in flight", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    let resolveCreate!: (v: api.MiniAppDiscussionInviteCreateResponse) => void;
    vi.mocked(api.miniAppCreateDiscussionInvite).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    await user.type(screen.getByTestId("mini-invite-name"), "A");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    const createBtn = screen.getByTestId("mini-invite-create");
    await user.click(createBtn);
    await user.click(createBtn);
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledTimes(1);
    resolveCreate({
      inviteId: "x",
      token: "t",
      expiresAt: "2099-01-01T00:00:00.000Z",
      previewPath: "/invite/discussion/t",
    });
  });

  it("shows manual share field when clipboard fails", async () => {
    const user = userEvent.setup();
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(
      <MiniAppInvitePartner
        {...baseProps}
        fixtureInviteLink="https://prof.remcard.ru/invite/discussion/fixture"
      />,
    );
    expect(await screen.findByTestId("invite-ready")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Поделиться приглашением" }));
    await user.click(screen.getByRole("button", { name: "Скопировать текст" }));
    expect(screen.getByRole("status")).toHaveTextContent(/вручную/);
    expect((screen.getByRole("textbox", { name: "Готовый текст" }) as HTMLTextAreaElement).value)
      .toContain("/invite/discussion/fixture");
  });

  it("shows terms and opens the existing full-cabinet gallery for offer links", async () => {
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} fixtureInviteLink="https://prof.remcard.ru/invite/fixture" />);
    expect(await screen.findByTestId("partner-link-invite-ready-terms")).toHaveTextContent("12%");
    await user.click(screen.getByRole("button", { name: "Ваши ссылки-приглашения" }));
    expect(baseProps.onOpenLink).toHaveBeenCalledWith("https://prof.remcard.ru/partners?invites=1");
  });

  it("shows review blocks and edit shortcuts return to steps", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    await user.type(screen.getByTestId("mini-invite-name"), "Видимый партнёр");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    fireEvent.change(screen.getByTestId("mini-invite-note"), {
      target: { value: "Видимый текст приглашения" },
    });
    await user.click(screen.getByTestId("mini-invite-next-2"));
    expect(screen.getByTestId("invite-review-partner")).toHaveTextContent("Видимый партнёр");
    expect(screen.getByTestId("invite-review-message")).toHaveTextContent("Видимый текст приглашения");
    await user.click(screen.getByRole("button", { name: "Изменить сообщение" }));
    expect(screen.getByTestId("mini-invite-wizard")).toHaveAttribute("data-step", "2");
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByRole("button", { name: "Изменить имя партнёра" }));
    expect(screen.getByTestId("mini-invite-wizard")).toHaveAttribute("data-step", "1");
  });

  it("blocks repeat POST after unknown transport on click and remount", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    vi.mocked(api.miniAppCreateDiscussionInvite).mockRejectedValue(new RemcardApiError(0, "Сеть"));
    const user = userEvent.setup();
    const { unmount } = render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    await user.type(screen.getByTestId("mini-invite-name"), "B");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByTestId("mini-invite-create"));
    await screen.findByTestId("mini-invite-create-error");
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mini-invite-create")).toBeDisabled();
    expect(screen.getByTestId("mini-invite-create-error")).toHaveTextContent(/полный кабинет/i);
    expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull();
    await user.click(screen.getByTestId("mini-invite-create"));
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledTimes(1);

    unmount();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    expect(screen.getByTestId("mini-invite-wizard")).toHaveAttribute("data-step", "3");
    await user.click(screen.getByTestId("mini-invite-create"));
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mini-invite-create")).toBeDisabled();
  });

  it("distinguishes transport failure from API rejection", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    vi.mocked(api.miniAppCreateDiscussionInvite).mockRejectedValue(new RemcardApiError(400, "Отклонено"));
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    await user.type(screen.getByTestId("mini-invite-name"), "B");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByTestId("mini-invite-create"));
    const err = await screen.findByTestId("mini-invite-create-error");
    expect(err).toHaveTextContent("Отклонено");
    expect(err).not.toHaveTextContent(/полный кабинет/i);
    expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull();
    expect(screen.getByTestId("mini-invite-create")).not.toBeDisabled();
    await user.click(screen.getByTestId("mini-invite-create"));
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledTimes(2);
  });
});
