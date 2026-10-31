import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { AdminAccessUsersClient } from "./AdminAccessUsersClient";

const fetchMock = vi.fn();
const createMock = vi.fn();
const revokeMock = vi.fn();

vi.mock("@/lib/prof-admin-access-users-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prof-admin-access-users-api")>(
    "@/lib/prof-admin-access-users-api",
  );
  return {
    ...actual,
    fetchAdminAccessUsers: (...args: unknown[]) => fetchMock(...args),
    createAdminAccessUser: (...args: unknown[]) => createMock(...args),
    revokeAdminAccessUser: (...args: unknown[]) => revokeMock(...args),
  };
});

const ownerList = {
  viewer: {
    id: "owner-1",
    publicId: "RC-OWN-1",
    displayName: "Owner Stand",
    staffRole: "OWNER" as const,
  },
  items: [
    {
      id: "owner-1",
      publicId: "RC-OWN-1",
      displayName: "Owner Stand",
      staffRole: "OWNER" as const,
      accessState: "active" as const,
      loginNormalized: "owner",
      credentialDisabledAt: null,
      isBlocked: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "admin-1",
      publicId: "RC-ADM-1",
      displayName: "Admin A",
      staffRole: "ADMIN" as const,
      accessState: "active" as const,
      loginNormalized: "admin.a",
      credentialDisabledAt: null,
      isBlocked: false,
      createdAt: "2026-10-15T12:00:00.000Z",
    },
  ],
};

describe("AdminAccessUsersClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    createMock.mockReset();
    revokeMock.mockReset();
    fetchMock.mockResolvedValue(ownerList);
  });

  afterEach(() => {
    cleanup();
  });

  it("exact route title and OWNER create via mocked API; password cleared", async () => {
    createMock.mockResolvedValue({
      item: {
        id: "admin-2",
        publicId: "RC-ADM-2",
        displayName: "Second Admin",
        staffRole: "ADMIN",
        accessState: "active",
        loginNormalized: "second.admin",
        credentialDisabledAt: null,
        isBlocked: false,
        createdAt: "2026-10-31T00:00:00.000Z",
      },
    });
    render(<AdminAccessUsersClient />);
    expect(await screen.findByRole("heading", { name: "Управление администраторами" })).toBeTruthy();
    expect(screen.getByTestId("access-users-viewer").textContent).toMatch(/Owner Stand/);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Second Admin" } });
    fireEvent.change(screen.getByLabelText("Логин"), { target: { value: "second.admin" } });
    fireEvent.change(screen.getByLabelText("Новый пароль"), {
      target: { value: "fixture-only-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать администратора" }));
    expect(await screen.findByText(/Администратор «Second Admin» создан/)).toBeTruthy();
    expect(createMock).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Новый пароль") as HTMLInputElement).value).toBe("");
    expect(document.body.textContent).not.toMatch(/fixture-only-pass|passwordHash|eyJ/);
  });

  it("403 is not masked as empty table", async () => {
    fetchMock.mockRejectedValue(new RemcardApiError(403, "Forbidden", { error: "Forbidden" }));
    render(<AdminAccessUsersClient />);
    expect(await screen.findByText(/Доступ только для OWNER или ADMIN/)).toBeTruthy();
    expect(screen.queryByText(/Пока нет второго администратора/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Создать администратора" })).toBeNull();
  });

  it("ADMIN viewer can create and revoke another ADMIN; OWNER row has no revoke", async () => {
    fetchMock.mockResolvedValue({
      viewer: {
        id: "admin-1",
        publicId: "RC-ADM-1",
        displayName: "Admin A",
        staffRole: "ADMIN" as const,
      },
      items: ownerList.items,
    });
    createMock.mockResolvedValue({
      item: {
        id: "admin-2",
        publicId: "RC-ADM-2",
        displayName: "Peer",
        staffRole: "ADMIN",
        accessState: "active",
        loginNormalized: "peer.admin",
        credentialDisabledAt: null,
        isBlocked: false,
        createdAt: "2026-10-31T00:00:00.000Z",
      },
    });
    render(<AdminAccessUsersClient />);
    expect(await screen.findByTestId("access-users-viewer")).toBeTruthy();
    expect(screen.getAllByText("Admin A").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Отключить доступ" })).toBeTruthy();
    expect(screen.getByText(/Владелец: удаление и понижение недоступны/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Peer" } });
    fireEvent.change(screen.getByLabelText("Логин"), { target: { value: "peer.admin" } });
    fireEvent.change(screen.getByLabelText("Новый пароль"), {
      target: { value: "abcdefghijkl" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать администратора" }));
    expect(await screen.findByText(/Администратор «Peer» создан/)).toBeTruthy();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("network error shows retry; empty state after reload", async () => {
    fetchMock.mockRejectedValueOnce(new RemcardApiError(503, "Upstream", null));
    render(<AdminAccessUsersClient />);
    expect(await screen.findByText(/Upstream|Не удалось загрузить/i)).toBeTruthy();
    fetchMock.mockResolvedValueOnce({
      viewer: ownerList.viewer,
      items: [ownerList.items[0]],
    });
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText(/Пока нет второго администратора/)).toBeTruthy();
  });

  it("revoke dialog Escape when idle; Tab stays inside; busy blocks Escape", async () => {
    let resolveRevoke: (v: unknown) => void = () => undefined;
    revokeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRevoke = resolve;
        }),
    );
    render(<AdminAccessUsersClient />);
    expect(await screen.findByText("Admin A")).toBeTruthy();
    const opener = screen.getByRole("button", { name: "Отключить доступ" });
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/сохранят автора/i)).toBeTruthy();

    // Tab trap wraps at edges (native mid-list Tab is browser-owned; jsdom has no native tab order)
    const confirmBtn = within(dialog).getByRole("button", { name: "Отключить доступ" });
    const cancelBtn = within(dialog).getByRole("button", { name: "Отмена" });
    cancelBtn.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(confirmBtn);
    confirmBtn.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cancelBtn);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Отключить доступ" }));
    const dialogBusy = await screen.findByRole("dialog");
    fireEvent.click(within(dialogBusy).getByRole("button", { name: "Отключить доступ" }));
    // busy: Escape must not close; cancel disabled
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Отмена" })).toBeDisabled();
    resolveRevoke({
      ok: true,
      idempotent: false,
      item: { ...ownerList.items[1], staffRole: null, accessState: "revoked" },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("confirmCancel gets initial focus and Escape restores without clearing", async () => {
    render(<AdminAccessUsersClient />);
    await screen.findByTestId("access-users-viewer");
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Очистить форму" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Очистить" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((screen.getByLabelText("Имя") as HTMLInputElement).value).toBe("Draft");
  });

  it("single-flight create and password clear on error too", async () => {
    createMock.mockRejectedValue(new RemcardApiError(409, "LOGIN_CONFLICT", { error: "LOGIN_CONFLICT" }));
    render(<AdminAccessUsersClient />);
    await screen.findByTestId("access-users-viewer");
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Dup" } });
    fireEvent.change(screen.getByLabelText("Логин"), { target: { value: "admin.a" } });
    fireEvent.change(screen.getByLabelText("Новый пароль"), {
      target: { value: "123456789012" },
    });
    const btn = screen.getByRole("button", { name: "Создать администратора" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/логин уже занят/i)).toBeTruthy();
    expect((screen.getByLabelText("Новый пароль") as HTMLInputElement).value).toBe("");
    expect(document.body.textContent).not.toMatch(/123456789012|passwordHash/);
  });
});
