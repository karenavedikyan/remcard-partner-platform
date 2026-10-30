/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminPartnersClient } from "./AdminPartnersClient";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const row = {
  id: "display-partner",
  publicId: "RC-DISPLAY",
  displayName: "Проверочный партнёр",
  partnerType: "COMPANY",
  partnerKind: "agent",
  city: "Краснодар",
  registrationLabel: "DEMO",
  lifecycle: null,
  catalogVisibility: "VISIBLE",
  publicCatalogLinks: [{ label: "Карточка партнёра", path: "/partner/display-partner" }],
  organizations: [{ id: "display-org", name: "Проверочная организация" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchPartnerRegistry.mockResolvedValue({ items: [row], total: 1, nextCursor: null, facets: null });
  api.previewPartnerLifecycle.mockResolvedValue({
    preview: { effects: ["Карточка будет скрыта"], warnings: [], confirmToken: "preview-token" },
  });
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
});

async function open() {
  render(<AdminPartnersClient />);
  await screen.findByText(row.displayName);
}

describe("PROF admin partner registry display (R1)", () => {
  it("shows agent kind in identity subtitle, not technical COMPANY type", async () => {
    await open();
    expect(screen.getByText("Агент · Краснодар")).toBeInTheDocument();
    expect(screen.queryByText(/COMPANY/)).not.toBeInTheDocument();
  });

  it.each(["AGENT", "MASTER", "STORE", "COMPANY"])(
    "forwards the %s type filter via type chips",
    async (kind) => {
      await open();
      const label =
        kind === "AGENT"
          ? /Агенты/
          : kind === "MASTER"
            ? /Специалисты/
            : kind === "STORE"
              ? /Магазины/
              : /Компании/;
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() =>
        expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("partnerType")).toBe(kind),
      );
    },
  );

  it("opens partner dialog with reversible actions without applying", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Проверочный партнёр/ }));
    const dialog = await screen.findByRole("heading", { name: "Карточка партнёра" });
    const root = dialog.closest("dialog")!;
    expect(within(root).getByRole("button", { name: "В архив проекта" })).toBeInTheDocument();
    expect(within(root).getByRole("button", { name: "Удалить из проекта" })).toBeInTheDocument();
    expect(api.previewPartnerLifecycle).not.toHaveBeenCalled();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });

  it("exposes moderation and public links inside the dialog", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Проверочный партнёр/ }));
    const dialog = (await screen.findByRole("heading", { name: "Карточка партнёра" })).closest(
      "dialog",
    )!;
    expect(within(dialog).getByRole("link", { name: "Открыть профиль модерации" })).toHaveAttribute(
      "href",
      "/admin/moderation/partners/display-partner",
    );
    expect(within(dialog).getByRole("link", { name: "Карточка партнёра" })).toHaveAttribute(
      "href",
      "https://remcard.ru/partner/display-partner",
    );
  });

  it("shows hidden catalog as Скрыт without claiming public visibility", async () => {
    api.fetchPartnerRegistry.mockResolvedValue({
      items: [
        {
          ...row,
          lifecycle: { catalogHiddenAt: "2026-10-27", projectArchivedAt: null },
          catalogVisibility: "HIDDEN",
          publicCatalogLinks: [],
        },
      ],
      total: 1,
      nextCursor: null,
      facets: null,
    });
    await open();
    expect(screen.getByText("Скрыт")).toBeInTheDocument();
  });

  it("forwards catalog visibility and archive filters", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Видимость"), { target: { value: "visible" } });
    await waitFor(() =>
      expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("catalogHidden")).toBe("false"),
    );
    fireEvent.change(screen.getByLabelText("Статус регистрации"), { target: { value: "archive" } });
    await waitFor(() =>
      expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("projectArchived")).toBe("true"),
    );
  });

  it("does not render a public link outside allowed catalog routes", async () => {
    api.fetchPartnerRegistry.mockResolvedValue({
      items: [{ ...row, publicCatalogLinks: [{ label: "Unsafe", path: "//evil.example" }] }],
      total: 1,
      nextCursor: null,
      facets: null,
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Проверочный партнёр/ }));
    const dialog = (await screen.findByRole("heading", { name: "Карточка партнёра" })).closest(
      "dialog",
    )!;
    expect(within(dialog).queryByRole("link", { name: /Unsafe/ })).not.toBeInTheDocument();
  });

  it("handles preview errors without applying a lifecycle action", async () => {
    api.previewPartnerLifecycle.mockRejectedValue(new Error("Проверка не выполнена"));
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Проверочный партнёр/ }));
    await screen.findByLabelText("Причина");
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Проверка" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Проверка не выполнена");
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });
});
