import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PartnerLinkInviteGallery } from "./PartnerLinkInviteGallery";
import { emptyLinkInviteList, type LinkInviteListRow } from "@/lib/link-invite-list";
import type { ProProfileResponse } from "@/lib/types";

const { remcardFetch } = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch,
  RemcardApiError: class extends Error {},
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "http://127.0.0.1:4312",
}));

function storeSenderProfile(): ProProfileResponse {
  return {
    user: {
      id: "sender",
      displayName: "Оптовик",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      storeCategories: ["doors"],
      specializations: [],
    },
    organization: null,
  } as unknown as ProProfileResponse;
}

function activeInviteRow(overrides: Partial<LinkInviteListRow> = {}): LinkInviteListRow {
  return {
    id: "inv-copy",
    status: "PENDING",
    statusLabel: "Активно",
    expiresAt: "2099-06-01T00:00:00.000Z",
    legacyTtl: false,
    createdAt: "2026-11-19T10:00:00.000Z",
    acceptedAt: null,
    intendedPartnerType: "MASTER",
    note: "Persisted invite note",
    partnershipId: null,
    previewPath: "/invite/copy-me",
    canCopyLink: true,
    canReissue: false,
    canEditPersonalLabel: true,
    createdBy: { userId: "u1", displayName: "Автор", at: "2026-11-19T10:00:00.000Z" },
    acceptedBy: null,
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

function archiveRow(overrides: Partial<LinkInviteListRow> = {}): LinkInviteListRow {
  return {
    id: "arch-2",
    status: "ACCEPTED",
    statusLabel: "Принято",
    expiresAt: "2099-06-01T00:00:00.000Z",
    legacyTtl: false,
    createdAt: "2026-11-18T10:00:00.000Z",
    acceptedAt: "2026-11-18T12:00:00.000Z",
    intendedPartnerType: "MASTER",
    note: null,
    partnershipId: "p1",
    previewPath: null,
    canCopyLink: false,
    canReissue: false,
    createdBy: { userId: "u1", displayName: "Автор архива", at: "2026-11-18T10:00:00.000Z" },
    acceptedBy: { userId: "u2", displayName: "Партнёр на странице 2", at: "2026-11-18T12:00:00.000Z" },
    terms: [],
    ...overrides,
  };
}

describe("PartnerLinkInviteGallery", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    remcardFetch.mockReset();
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flushSearchDebounce() {
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
  }

  it("shows selectable public url when clipboard is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({
        personalLabel: "Секретное имя",
        recipientLabel: "Получатель",
        note: "Публичный комментарий",
      }),
    );
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);

    await screen.findByTestId("link-invite-card-inv-copy");
    fireEvent.click(screen.getByTestId("link-invite-copy"));

    const manual = await screen.findByTestId("link-invite-manual-url-inv-copy");
    expect(manual).toHaveValue("http://127.0.0.1:4312/invite/copy-me");
    expect(manual).toHaveAttribute("readonly");
    expect(screen.getByTestId("link-invite-gallery-hint-inv-copy")).toHaveTextContent(/вручную/i);
    expect(manual).not.toHaveValue(/Секретное имя/);
  });

  it("copies invitation text with blank line before url from card footer", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow({ recipientLabel: "Илья Лебедев" }));
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);

    await screen.findByTestId("link-invite-card-inv-copy");
    fireEvent.click(screen.getByTestId("link-invite-copy"));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toMatch(/Persisted invite note\n\nhttp:\/\/127\.0\.0\.1:4312\/invite\/copy-me/);
    expect(await screen.findByTestId("link-invite-gallery-hint-inv-copy")).toHaveTextContent(/скопирован/i);
  });

  it("shows list title disclosure when rename is denied", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({
        canEditPersonalLabel: false,
        recipientLabel: "Очень длинное название получателя без права переименования",
      }),
    );
    remcardFetch.mockResolvedValue(list);

    render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />,
    );

    await screen.findByTestId("link-invite-card-inv-copy");
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    expect(screen.getByTestId("link-invite-title-disclosure-inv-copy")).toBeInTheDocument();
  });

  it("hides rename control when server denies canEditPersonalLabel", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow({ canEditPersonalLabel: false }));
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);

    await screen.findByTestId("link-invite-card-inv-copy");
    expect(screen.queryByRole("button", { name: "Изменить частное название" })).toBeNull();
  });

  it("shows empty search state without clearing query when switching view", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow({ note: "Alpha" }));
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);

    const search = await screen.findByTestId("link-invite-gallery-search");
    fireEvent.change(search, { target: { value: "нет-такого" } });
    await flushSearchDebounce();
    expect(await screen.findByTestId("link-invite-gallery-empty")).toHaveTextContent(/Ничего не найдено/);
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    expect(search).toHaveValue("нет-такого");
  });

  it("finds archive match on a later page and does not show empty until paging completes", async () => {
    const page1 = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    page1.archive.items.push(
      archiveRow({ id: "arch-1", acceptedBy: { userId: "u2", displayName: "Первая страница", at: "2026-11-17T12:00:00.000Z" } }),
    );
    page1.archive.nextCursor = "cursor-2";

    const page2 = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    page2.archive.items.push(archiveRow());
    page2.archive.nextCursor = null;

    remcardFetch.mockImplementation(async (url: string) => {
      if (url.includes("archiveCursor=cursor-2")) return page2;
      return page1;
    });

    render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} defaultPhase="archive" />,
    );

    await screen.findByTestId("link-invite-card-arch-1");
    const search = screen.getByTestId("link-invite-gallery-search");
    fireEvent.change(search, { target: { value: "странице 2" } });
    await flushSearchDebounce();

    await waitFor(() => expect(screen.getByTestId("link-invite-card-arch-2")).toBeInTheDocument());
    expect(screen.queryByTestId("link-invite-gallery-empty")).toBeNull();
    expect(remcardFetch).toHaveBeenCalledWith(expect.stringContaining("archiveCursor=cursor-2"));
  });

  it("clears selection while search is still debouncing", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({ id: "inv-a", recipientLabel: "Alpha note" }),
      activeInviteRow({ id: "inv-b", recipientLabel: "Beta note" }),
    );
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);
    await screen.findByTestId("link-invite-card-inv-a");

    fireEvent.click(screen.getByRole("button", { name: "Выбрать" }));
    fireEvent.click(screen.getByLabelText(/Выбрать Alpha note/i));
    expect(screen.getByTestId("link-invite-gallery-bulk-revoke")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("link-invite-gallery-search"), { target: { value: "Beta" } });
    expect(screen.queryByTestId("link-invite-gallery-bulk-revoke")).toBeNull();
  });

  it("drops manual copy url after invite moves to archive", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const active = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    active.active.items.push(activeInviteRow({ id: "inv-move" }));

    const archived = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    archived.active.items = [];
    archived.archive.items.push({
      ...activeInviteRow({ id: "inv-move" }),
      status: "ACCEPTED",
      statusLabel: "Принято",
      canCopyLink: false,
      previewPath: null,
      acceptedBy: { userId: "u2", displayName: "Партнёр", at: "2026-11-18T12:00:00.000Z" },
    });

    let load = 0;
    remcardFetch.mockImplementation(async () => {
      load += 1;
      return load === 1 ? active : archived;
    });

    const { rerender } = render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} refreshToken={0} />,
    );

    await screen.findByTestId("link-invite-card-inv-move");
    fireEvent.click(screen.getByTestId("link-invite-copy"));
    expect(await screen.findByTestId("link-invite-manual-url-inv-move")).toBeInTheDocument();

    rerender(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} refreshToken={1} />,
    );
    await screen.findByTestId("link-invite-gallery");
    fireEvent.click(screen.getByRole("tab", { name: /Архив/i }));

    expect(screen.queryByTestId("link-invite-manual-url-inv-move")).toBeNull();
    expect(screen.queryByTestId("link-invite-gallery-hint-inv-move")).toBeNull();
  });

  it("clears bulk selection when search query changes", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({ id: "inv-a", recipientLabel: "Alpha note" }),
      activeInviteRow({ id: "inv-b", recipientLabel: "Beta note" }),
    );
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);
    await screen.findByTestId("link-invite-card-inv-a");

    fireEvent.click(screen.getByRole("button", { name: "Выбрать" }));
    fireEvent.click(screen.getByLabelText(/Выбрать Alpha note/i));

    const search = screen.getByTestId("link-invite-gallery-search");
    fireEvent.change(search, { target: { value: "Beta" } });
    await flushSearchDebounce();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Отозвать \(\d+\)/ })).toBeNull();
    });
  });

  it("legacy row blocks copy and offers reissue path in terms", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({
        id: "legacy-1",
        canCopyLink: false,
        canReissue: true,
        previewPath: null,
        legacyTtl: true,
      }),
    );
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);
    await screen.findByTestId("link-invite-card-legacy-1");
    fireEvent.click(screen.getByRole("button", { name: /Условия/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Перевыпустить ссылку" })).toBeInTheDocument());
  });

  it("archive tab is read-only without pending actions", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.archive.items.push(archiveRow({ id: "arch-ro" }));
    remcardFetch.mockResolvedValue(list);

    render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} defaultPhase="archive" />,
    );

    await screen.findByTestId("link-invite-card-arch-ro");
    expect(screen.getByText(/Создал приглашение Автор архива/i)).toBeInTheDocument();
    expect(screen.getByText(/Принял: Партнёр на странице 2/i)).toBeInTheDocument();
    expect(screen.queryByTestId("link-invite-copy")).toBeNull();
    expect(screen.queryByRole("button", { name: "Выбрать" })).toBeNull();
  });

  it("does not close on Escape while revoke confirm is open", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow());
    remcardFetch.mockResolvedValue(list);
    const onClose = vi.fn();

    render(<PartnerLinkInviteGallery open onClose={onClose} meProfile={storeSenderProfile()} />);
    await screen.findByTestId("link-invite-card-inv-copy");
    fireEvent.click(screen.getByRole("button", { name: "Отозвать ссылку" }));
    await screen.findByTestId("link-invite-revoke-confirm");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});