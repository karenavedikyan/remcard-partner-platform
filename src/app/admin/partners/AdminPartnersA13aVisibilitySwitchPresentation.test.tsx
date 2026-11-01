/** @vitest-environment jsdom */
/**
 * A13a — R1 visibility switch chrome in partner detail drawer.
 * Switches request preview/confirm; they do not apply lifecycle immediately.
 */
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
  previewPartnerAccountDelete: vi.fn(),
  applyPartnerAccountDelete: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";

function registryPayload() {
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
    total: 1,
    facets: {
      matchedTotal: 1,
      partnerKind: {
        all: 1,
        agent: 1,
        specialist: 0,
        store: 0,
        company: 0,
        unknown: 0,
        facetRule: "ignores_partner_type",
      },
      registration: { active: 1, demo: 0, facetRule: "with_other_filters" },
      catalog: { visible: 1, hidden: 0, notPublic: 0, facetRule: "with_other_filters" },
      archive: { archived: 0, notArchived: 1, facetRule: "with_other_filters" },
    },
    nextCursor: null,
  };
}

describe("A13a partner detail visibility switches", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams();
    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    api.fetchPartnerRegistry.mockReset();
    api.previewPartnerLifecycle.mockReset();
    api.applyPartnerLifecycle.mockReset();
    api.fetchPartnerRegistry.mockResolvedValue(registryPayload());
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["Скроет из каталога"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "tok-a13a",
      },
    });
  });

  it("renders R1 switch chrome and still requires preview before apply", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    const dialog = (await screen.findByRole("heading", { name: "Карточка партнёра" })).closest(
      "dialog",
    ) as HTMLElement;

    const catalogSwitch = within(dialog).getByRole("switch", { name: "Видимость в каталоге" });
    const searchSwitch = within(dialog).getByRole("switch", { name: "Видимость в сотрудничестве" });
    expect(catalogSwitch).toHaveAttribute("aria-checked", "true");
    expect(searchSwitch).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).queryByRole("button", { name: "Убрать из каталога" })).toBeNull();

    fireEvent.change(within(dialog).getByLabelText("Причина"), {
      target: { value: "A13a switch preview" },
    });
    fireEvent.click(catalogSwitch);
    await waitFor(() =>
      expect(api.previewPartnerLifecycle).toHaveBeenCalledWith("p1", "hide_catalog"),
    );
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Подтвердить" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Отмена" })).toBeTruthy();
  });
});
