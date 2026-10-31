/** @vitest-environment jsdom */
/**
 * R1 Partners visual parity — presentation contracts.
 * Safety/lifecycle behavior remains covered by existing mass-action / search / registry tests.
 * Replaces obsolete A3a/A3b layout-pin assertions that conflicted with owner R1 redesign.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";

const ROOT = path.join(__dirname);
const CSS = path.join(ROOT, "AdminPartners.module.css");
const CLIENT = path.join(ROOT, "AdminPartnersClient.tsx");
const METRICS = path.join(ROOT, "AdminPartnersMetricsBar.tsx");
const LIST = path.join(ROOT, "AdminPartnersRegistryList.tsx");
const DETAIL = path.join(ROOT, "AdminPartnersPartnerDetailDialog.tsx");

const facets = {
  matchedTotal: 12,
  partnerKind: {
    all: 12,
    agent: 3,
    specialist: 4,
    store: 2,
    company: 2,
    unknown: 0,
    facetRule: "ignores_partner_type",
  },
  registration: { active: 8, demo: 4, facetRule: "with_other_filters" },
  catalog: { visible: 5, hidden: 3, notPublic: 4, facetRule: "with_other_filters" },
  archive: { archived: 2, notArchived: 10, facetRule: "with_other_filters" },
};

function registryPayload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: "p1",
        publicId: "P001",
        displayName: "Тест Партнёр",
        partnerType: "AGENT",
        partnerKind: "agent",
        city: "Краснодар",
        registrationLabel: "ACTIVE",
        lifecycle: null,
        catalogVisibility: "VISIBLE",
        partnerSearchVisibility: {
          visible: true,
          reasonCode: "OK",
          reasonLabel: "Доступен",
          adminOverride: "AUTO",
        },
        partnershipCounts: {
          active: 1,
          invited: 0,
          pending: 0,
          paused: 0,
          ended: 0,
          total: 1,
        },
        publicCatalogLinks: [],
      },
    ],
    total: 12,
    facets,
    nextCursor: null,
    ...overrides,
  };
}

describe("Admin Partners R1 parity presentation", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams();
    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    api.fetchPartnerRegistry.mockReset();
    api.previewPartnerLifecycle.mockReset();
    api.applyPartnerLifecycle.mockReset();
    api.fetchPartnerRegistry.mockResolvedValue(registryPayload());
  });

  it("keeps R1 structural markers in source (chips, panel toolbar, detail dialog, visit GAP)", () => {
    const css = readFileSync(CSS, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    const metrics = readFileSync(METRICS, "utf8");
    const list = readFileSync(LIST, "utf8");
    const detail = readFileSync(DETAIL, "utf8");

    expect(metrics).toContain("Все типы");
    expect(metrics).toContain("typeCounter");
    expect(client).toContain("Регистрация и видимость");
    expect(client).toContain("Имя, компания, город, ID");
    expect(client).toContain("AdminPartnersPartnerDetailDialog");
    expect(list).toContain("Визит*");
    expect(list).toContain("Нет данных");
    expect(detail).toContain("Карточка партнёра");
    expect(detail).toContain("Удалить из проекта");
    expect(detail).toContain("archive_project");
    expect(css).toContain(".filterChip");
    expect(css).toContain(".bulkBar");
    expect(css).toContain(".partnerDetailDialog");
    expect(css).toContain(".partnerDetailDrawer");
    expect(css).toContain(".partnersTable");
    expect(client).toContain("invalidateSinglePreviewContext");
    expect(client).toContain("dialogError");
    expect(client).toContain("Повторить загрузку");
    expect(client).toContain("data-partner-open-trigger");
    expect(detail).toContain("dialogError");
    // No fabricated RemScore / visit API fields
    expect(detail).toContain("RemScore"); // named only as GAP/LIMIT, not as computed metric
    expect(client).not.toMatch(/fetchAdminPartnerDetail|profileFill|lastVisit/);
  });

  it("does not touch partner LK runtime paths", () => {
    const client = readFileSync(CLIENT, "utf8");
    expect(client).not.toContain("src/components/partners");
    expect(client).not.toContain("@/components/partners");
  });

  it("renders R1 page head, type chips, search and opens partner dialog", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Партнёры" })).toBeTruthy());
    expect(screen.getByText("Регистрация и видимость")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Все типы/ })).toBeTruthy();
    expect(screen.getByTestId("partner-search")).toBeTruthy();
    expect(screen.getByTestId("partner-result-count").textContent).toContain("12");

    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Карточка партнёра" })).toBeTruthy());
    const dialog = screen.getByRole("heading", { name: "Карточка партнёра" }).closest("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog as HTMLElement).getByText(/Краснодар/)).toBeTruthy();
    expect(within(dialog as HTMLElement).getAllByText("Нет данных").length).toBeGreaterThan(0);
  });

  it("preserves preview/confirm for lifecycle from detail dialog", async () => {
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["Скроет из каталога"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "tok-1",
      },
    });
    api.applyPartnerLifecycle.mockResolvedValue({});

    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => screen.getByLabelText("Причина"));

    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Тест причины" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    await waitFor(() => expect(api.previewPartnerLifecycle).toHaveBeenCalledWith("p1", "hide_catalog"));
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() =>
      expect(api.applyPartnerLifecycle).toHaveBeenCalledWith(
        "p1",
        "hide_catalog",
        "Тест причины",
        "tok-1",
      ),
    );
  });

  it("keeps bulk safety: quick bar expands to reason+preview before apply", async () => {
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["Архив"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "bulk-tok",
      },
    });

    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByLabelText("Выбрать Тест Партнёр"));
    await waitFor(() => screen.getByTestId("selected-count"));
    // Release1-style compact bar: no long form until an action is chosen.
    expect(screen.queryByLabelText("Причина группового изменения")).toBeNull();
    expect(screen.getByRole("button", { name: "Каталог" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Сотрудничество" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => screen.getByLabelText("Групповое действие"));
    expect(screen.getByLabelText("Групповое действие")).toHaveValue("archive_project");
    expect(screen.getByLabelText("Причина группового изменения")).toBeTruthy();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });

  it("maps bulk «Удалить из проекта» to archive_project, not hide_catalog", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByLabelText("Выбрать Тест Партнёр"));
    await waitFor(() => screen.getByTestId("selected-count"));
    fireEvent.click(screen.getByRole("button", { name: "Удалить из проекта" }));
    await waitFor(() => screen.getByLabelText("Групповое действие"));
    expect(screen.getByLabelText("Групповое действие")).toHaveValue("archive_project");
  });

  it("drops deferred preview when opening another partner before resolve", async () => {
    let resolvePreview!: (value: unknown) => void;
    api.previewPartnerLifecycle.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve;
        }),
    );
    api.fetchPartnerRegistry.mockResolvedValue(
      registryPayload({
        items: [
          registryPayload().items[0],
          {
            ...registryPayload().items[0],
            id: "p2",
            publicId: "P049",
            displayName: "Другой Партнёр",
          },
        ],
        total: 2,
      }),
    );

    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => screen.getByLabelText("Причина"));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Причина A" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    await waitFor(() => expect(api.previewPartnerLifecycle).toHaveBeenCalledWith("p1", "hide_catalog"));

    fireEvent.click(screen.getByRole("button", { name: "Закрыть карточку" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Карточка партнёра" })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Другой Партнёр/ }));
    await waitFor(() => screen.getByLabelText("Причина"));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Причина B" } });

    resolvePreview({
      preview: {
        effects: ["Скроет A"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "QA:P001:hide_catalog",
      },
    });
    await waitFor(() => expect(screen.queryByText("Скроет A")).toBeNull());
    expect(screen.queryByRole("button", { name: "Подтвердить" })).toBeNull();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });

  it("shows preview and apply errors inside the open dialog", async () => {
    api.previewPartnerLifecycle.mockRejectedValue(new Error("preview boom 500"));
    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => screen.getByLabelText("Причина"));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Причина" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    const dialog = (await screen.findByRole("heading", { name: "Карточка партнёра" })).closest(
      "dialog",
    )!;
    await waitFor(() => expect(within(dialog).getByRole("alert").textContent).toContain("preview boom 500"));
    const errorZone = within(dialog).getByRole("alert");
    expect(errorZone).toHaveAttribute("data-dialog-error-zone", "true");
    expect(within(errorZone).getByRole("button", { name: "Повторить" })).toBeTruthy();
    expect(screen.getByLabelText("Причина")).toHaveValue("Причина");

    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["ok"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "tok-err",
      },
    });
    api.applyPartnerLifecycle.mockRejectedValue(new Error("apply boom 500"));
    fireEvent.click(within(errorZone).getByRole("button", { name: "Повторить" }));
    await waitFor(() => screen.getByRole("button", { name: "Подтвердить" }));
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() =>
      expect(within(dialog).getByRole("alert").textContent).toContain("apply boom 500"),
    );
    expect(screen.getByLabelText("Причина")).toHaveValue("Причина");
    expect(within(dialog).getByRole("button", { name: "Повторить" })).toBeTruthy();
  });

  it("reveals dialog error zone as an early sticky child of the scroll body", () => {
    const detail = readFileSync(DETAIL, "utf8");
    const css = readFileSync(CSS, "utf8");
    expect(detail).toContain("dialogErrorZone");
    expect(detail).toContain("data-dialog-error-zone");
    expect(detail).toContain("onRetryDialogError");
    expect(detail).toContain("postApplyFocusKey");
    expect(css).toContain(".dialogErrorZone");
    expect(css).toMatch(/\.dialogErrorZone\s*\{[^}]*position:\s*sticky/s);
    expect(css).toMatch(/\.detailToggleActions\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.detailSettingsRow\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(css).not.toMatch(/\.detailToggleActions\s*\{[^}]*flex-shrink:\s*0/s);
  });

  it("resets mobile settings flex-basis so short copy/actions are not 14rem tall", () => {
    const css = readFileSync(CSS, "utf8");
    const detail = readFileSync(DETAIL, "utf8");
    const list = readFileSync(LIST, "utf8");
    expect(css).toMatch(/\.detailSettingsCopy\s*\{[^}]*flex:\s*1\s+1\s+14rem/s);
    expect(css).toMatch(/\.detailToggleActions\s*\{[^}]*flex:\s*0\s+1\s+auto/s);
    // Mobile column axis must not inherit the 14rem height basis.
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.detailSettingsCopy,\s*\n\s*\.detailToggleActions\s*\{[^}]*flex-basis:\s*auto/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.detailSettingsCopy,\s*\n\s*\.detailToggleActions\s*\{[^}]*flex:\s*0\s+0\s+auto/s,
    );
    expect(css).not.toMatch(/\.detailSettingsCopy[^{]*\{[^}]*max-height:\s*\d/s);
    expect(css).not.toMatch(/\.detailToggleActions[^{]*\{[^}]*overflow:\s*hidden/s);
    expect(detail).toContain("detailRegBadge");
    expect(css).toMatch(/\.detailRegBadge\s*\{[^}]*width:\s*fit-content/s);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.detailStats\s*>\s*div:last-child\s*\{[^}]*display:\s*flex/s,
    );
    expect(list).toContain("colPartner");
    expect(css).toMatch(/\.colPartner\s*\{[^}]*width:\s*298px/s);
    expect(css).toMatch(/\.colReg\s*\{[^}]*width:\s*161px/s);
    expect(css).toMatch(/\.colCatalog\s*\{[^}]*width:\s*122px/s);
    expect(css).toMatch(/\.colCoop\s*\{[^}]*width:\s*179px/s);
    expect(css).toMatch(/\.partnerName\s*\{[^}]*max-width:\s*290px/s);
  });

  it("focuses the reason field after successful apply while keeping the dialog open", async () => {
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["Скроет из каталога"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "tok-focus",
      },
    });
    api.applyPartnerLifecycle.mockResolvedValue({});
    api.fetchPartnerRegistry
      .mockResolvedValueOnce(registryPayload())
      .mockResolvedValueOnce(registryPayload());

    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => screen.getByLabelText("Причина"));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Тест причины" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    await waitFor(() => screen.getByRole("button", { name: "Подтвердить" }));
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("button", { name: "Подтвердить" })).toBeNull());
    expect(screen.getByRole("heading", { name: "Карточка партнёра" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Причина")));
    expect(screen.getByLabelText("Причина")).toHaveValue("");
    expect(screen.getByLabelText("Причина")).not.toBeDisabled();
  });

  it("offers explicit registry retry that reloads with same filters", async () => {
    api.fetchPartnerRegistry
      .mockRejectedValueOnce(new Error("registry boom 500"))
      .mockResolvedValueOnce(registryPayload());
    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByRole("alert"));
    expect(screen.getByText("registry boom 500")).toBeTruthy();
    const retry = screen.getByRole("button", { name: "Повторить загрузку" });
    expect(retry).not.toBeDisabled();
    fireEvent.click(retry);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    expect(api.fetchPartnerRegistry).toHaveBeenCalledTimes(2);
  });

  it("restores focus to the row name trigger after closing the dialog", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    const openBtn = screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ });
    openBtn.focus();
    fireEvent.click(openBtn);
    await waitFor(() => screen.getByRole("heading", { name: "Карточка партнёра" }));
    fireEvent.click(screen.getByRole("button", { name: "Закрыть карточку" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Карточка партнёра" })).toBeNull());
    await waitFor(() => {
      const trigger = screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ });
      expect(trigger).toHaveAttribute("data-partner-open-trigger", "p1");
      expect(document.activeElement).toBe(trigger);
    });
  });
});
