/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    remcardFetch: (...args: unknown[]) => remcardFetch(...args),
  };
});

import { AdminSettingsClient } from "./AdminSettingsClient";

beforeEach(() => {
  remcardFetch.mockReset();
});

describe("AdminSettingsClient A35b", () => {
  const row = (id: string) => ({
    id, action: "ADMIN_USER_UPDATED", createdAt: "2026-01-01T00:00:00Z",
    target: { displayName: id },
  });

  it("shows retry for corrupt rows instead of a false empty state", async () => {
    remcardFetch.mockResolvedValueOnce({ items: [null], hasMore: false, nextCursor: null });
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    expect(await screen.findByTestId("admin-settings-audit-retry")).toBeTruthy();
    expect(screen.queryByTestId("admin-settings-audit-empty")).toBeNull();
  });

  it("rejects duplicate ids across keyset pages", async () => {
    remcardFetch
      .mockResolvedValueOnce({ items: [row("one")], hasMore: true, nextCursor: "c1" })
      .mockResolvedValueOnce({ items: [row("one")], hasMore: false, nextCursor: null });
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    fireEvent.click(await screen.findByTestId("admin-settings-audit-load-more"));
    expect(await screen.findByText("Журнал вернул повторяющиеся записи.")).toBeTruthy();
    expect(screen.queryByTestId("admin-settings-audit-empty")).toBeNull();
  });

  it("rejects a repeated continuation cursor", async () => {
    remcardFetch
      .mockResolvedValueOnce({ items: [row("one")], hasMore: true, nextCursor: "c1" })
      .mockResolvedValueOnce({ items: [row("two")], hasMore: true, nextCursor: "c1" });
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    fireEvent.click(await screen.findByTestId("admin-settings-audit-load-more"));
    expect(await screen.findByText("Журнал вернул повторяющийся курсор страницы.")).toBeTruthy();
  });

  it("ignores a stale request after leaving and reopening the audit tab", async () => {
    let resolveOld!: (value: unknown) => void;
    const old = new Promise((resolve) => { resolveOld = resolve; });
    remcardFetch
      .mockReturnValueOnce(old)
      .mockResolvedValueOnce({ items: [row("newest")], hasMore: false, nextCursor: null });
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("admin-settings-tab-types"));
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    expect(await screen.findByText("newest")).toBeTruthy();
    await act(async () => {
      resolveOld({ items: [row("stale")], hasMore: false, nextCursor: null });
      await old;
    });
    await waitFor(() => expect(screen.queryByText("stale")).toBeNull());
    expect(screen.getByText("newest")).toBeTruthy();
  });

  it("shows R1 partner types and account re-register rule copy", () => {
    render(<AdminSettingsClient />);
    expect(screen.getByRole("heading", { name: "Настройки" })).toBeTruthy();
    expect(screen.getByText("Удалить аккаунт для регистрации заново")).toBeTruthy();
    expect(screen.getByTestId("admin-settings-notifications-link").getAttribute("href")).toBe(
      "/admin/notifications#admin-notify-settings-title",
    );
  });

  it("audit tab loads journal rows via BFF path", async () => {
    remcardFetch.mockResolvedValueOnce({
      items: [
        {
          id: "1",
          action: "ADMIN_USER_UPDATED",
          createdAt: "2026-01-02T10:00:00.000Z",
          actor: { displayName: "Owner", publicId: "RC-1" },
          target: { displayName: "Peer", publicId: "RC-2" },
          meta: { changedFields: ["staffRole"] },
        },
      ],
      hasMore: false,
      nextCursor: null,
    });
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/pro/admin/access/audit?limit=25");
    });
    expect(await screen.findByText("Изменение доступа администратора")).toBeTruthy();
    expect(screen.getByText("Owner (RC-1)")).toBeTruthy();
  });

  it("audit tab shows forbidden on 403", async () => {
    remcardFetch.mockRejectedValueOnce(new RemcardApiError(403, "Forbidden"));
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    expect(await screen.findByTestId("admin-settings-audit-forbidden")).toBeTruthy();
  });

  it("audit append uses nextCursor and retry after parse error", async () => {
    remcardFetch
      .mockResolvedValueOnce({
        items: [{ id: "1", action: "ADMIN_USER_UPDATED", createdAt: "2026-01-01T00:00:00.000Z" }],
        hasMore: true,
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        items: [{ id: "2", action: "ADMIN_USER_UPDATED", createdAt: "2026-01-02T00:00:00.000Z" }],
        hasMore: false,
        nextCursor: null,
      })
      .mockResolvedValueOnce({ notItems: true })
      .mockResolvedValueOnce({
        items: [{ id: "3", action: "ADMIN_USER_UPDATED", createdAt: "2026-01-03T00:00:00.000Z" }],
        hasMore: false,
        nextCursor: null,
      });
    render(<AdminSettingsClient />);
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    await waitFor(() => expect(screen.getByTestId("admin-settings-audit-load-more")).toBeTruthy());
    fireEvent.click(screen.getByTestId("admin-settings-audit-load-more"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledWith("/api/pro/admin/access/audit?limit=25&cursor=c1"));
    fireEvent.click(screen.getByTestId("admin-settings-tab-types"));
    fireEvent.click(screen.getByTestId("admin-settings-tab-audit"));
    await waitFor(() => expect(screen.getByTestId("admin-settings-audit-retry")).toBeTruthy());
    fireEvent.click(screen.getByTestId("admin-settings-audit-retry"));
    await waitFor(() => expect(screen.getByText("Изменение доступа администратора")).toBeTruthy());
  });
});
