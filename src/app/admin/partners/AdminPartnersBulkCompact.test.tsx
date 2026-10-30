import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
}));

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";

function row(id: string, name: string) {
  return {
    id,
    displayName: name,
    partnerType: "STORE",
    registrationLabel: "DEMO" as const,
    lifecycle: null,
    city: "City",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
  api.fetchPartnerRegistry.mockResolvedValue({
    items: [row("p1", "Partner One"), row("p2", "Partner Two")],
    total: 4,
    nextCursor: "cursor-page-2",
  });
  api.previewPartnerLifecycle.mockImplementation(async (userId: string) => ({
    preview: {
      effects: [`effect-${userId}`],
      warnings: [],
      displayName: userId,
      confirmToken: `token-${userId}`,
    },
  }));
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
});

describe("Admin partners bulk selection and compact registry", () => {
  it("selects current page only and keeps other-page count when paginating", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Partner One");
    fireEvent.click(screen.getByLabelText("Выбрать на странице"));
    expect(screen.getByText(/Выбрано:/).textContent).toMatch(/2/);
    api.fetchPartnerRegistry.mockResolvedValueOnce({
      items: [row("p3", "Partner Three")],
      total: 4,
      nextCursor: null,
    });
    fireEvent.click(screen.getByRole("button", { name: "Следующая страница" }));
    await screen.findByText("Partner Three");
    expect(screen.getByText(/на других страницах: 2/)).toBeInTheDocument();
  });

  it("clears selection when filters change", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Partner One");
    fireEvent.click(screen.getByLabelText("Выбрать Partner One"));
    fireEvent.change(screen.getByLabelText("Статус регистрации"), { target: { value: "demo" } });
    await waitFor(() => expect(screen.queryByText(/Выбрано:/)).toBeNull());
  });

  it("does not POST apply before group preview and confirmation", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Partner One");
    fireEvent.click(screen.getByRole("checkbox", { name: "Выбрать Partner One" }));
    await waitFor(() => expect(screen.getByText(/Выбрано:/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Причина группового изменения"), {
      target: { value: "Group reason" },
    });
    fireEvent.change(screen.getByLabelText("Групповое действие"), {
      target: { value: "hide_catalog" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Групповое действие")).toHaveValue("hide_catalog"),
    );
    const previewBtn = screen.getByRole("button", { name: "Получить preview группы" });
    await waitFor(() => expect(previewBtn).toBeEnabled());
    fireEvent.click(previewBtn);
    await waitFor(() => expect(api.previewPartnerLifecycle).toHaveBeenCalledWith("p1", "hide_catalog"));
    await screen.findByRole("dialog", { name: "Подтверждение группового изменения" });
    expect(screen.getByText(/effect-p1/)).toBeInTheDocument();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить группу" }));
    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalledTimes(1));
    expect(api.applyPartnerLifecycle).toHaveBeenCalledWith(
      "p1",
      "hide_catalog",
      "Group reason",
      "token-p1",
    );
  });

  it("keeps registration=active on client param change without remount", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled());
    nav.params = new URLSearchParams("registration=active");
    render(<AdminPartnersClient />);
    await waitFor(() =>
      expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("registration")).toBe("active"),
    );
  });

  it("sends limit with registry fetch", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled());
    expect(api.fetchPartnerRegistry.mock.calls[0][0].get("limit")).toBe("25");
    fireEvent.change(screen.getByLabelText("Записей на странице"), { target: { value: "100" } });
    await waitFor(() =>
      expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("limit")).toBe("100"),
    );
  });
});
