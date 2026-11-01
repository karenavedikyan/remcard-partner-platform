import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminClientDetailDrawer } from "./AdminClientDetailDrawer";
import type { AdminClient } from "@/lib/prof-admin-clients-api";

const client: AdminClient = {
  id: "c-1",
  publicId: "RC-C001",
  displayName: "Александр Белов",
  role: "CLIENT",
  city: "Краснодар",
  photoUrl: null,
  clientAvatarUrl: null,
  isBlocked: false,
  createdAt: "2025-02-11T00:00:00.000Z",
};

describe("AdminClientDetailDrawer", () => {
  it("shows DTO identity/registration and honest GAPs for frozen-only fields", async () => {
    const onClose = vi.fn();
    const returnFocusRef = { current: document.createElement("button") };
    document.body.appendChild(returnFocusRef.current);
    render(
      <AdminClientDetailDrawer client={client} onClose={onClose} returnFocusRef={returnFocusRef} />,
    );
    const dialog = await screen.findByTestId("client-detail-drawer");
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "Карточка клиента" })).toBeTruthy();
    expect(screen.getByTestId("client-detail-name")).toHaveTextContent("Александр Белов");
    expect(screen.getByTestId("client-detail-public-id")).toHaveTextContent("RC-C001");
    expect(screen.getByTestId("client-detail-city")).toHaveTextContent("Краснодар");
    expect(screen.getByTestId("client-detail-registered").textContent).toMatch(/2025|февр|фев/i);
    expect(screen.getByTestId("client-detail-source-gap").textContent).toMatch(/Источник рекомендации/);
    expect(screen.getByTestId("client-detail-consent-gap").textContent).toMatch(/Согласие|визит/i);
    expect(screen.getByTestId("client-detail-stage-gap").textContent).toMatch(/Этап сделки/);
    expect(screen.getByTestId("client-detail-history-stage-gap").textContent).toMatch(/Пока нет/);
    expect(dialog.textContent).not.toMatch(/сделк[аи].*завершен|проекты клиента|источник-партнёр живой/i);
    expect(dialog.querySelector("form")).toBeNull();
  });

  it("closes via footer and returns focus to the opener", async () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    opener.textContent = "open";
    document.body.appendChild(opener);
    const returnFocusRef = { current: opener };
    const { rerender } = render(
      <AdminClientDetailDrawer client={client} onClose={onClose} returnFocusRef={returnFocusRef} />,
    );
    await screen.findByTestId("client-detail-drawer");
    await userEvent.setup().click(screen.getByTestId("client-detail-close-footer"));
    expect(onClose).toHaveBeenCalled();
    rerender(
      <AdminClientDetailDrawer client={null} onClose={onClose} returnFocusRef={returnFocusRef} />,
    );
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("closes on dialog cancel (Escape) without inventing write actions", async () => {
    const onClose = vi.fn();
    const returnFocusRef = { current: document.createElement("button") };
    render(
      <AdminClientDetailDrawer client={client} onClose={onClose} returnFocusRef={returnFocusRef} />,
    );
    const dialog = await screen.findByTestId("client-detail-drawer");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalled();
    expect(dialog.textContent).not.toMatch(/сохранить|удалить|редактир/i);
  });
});
