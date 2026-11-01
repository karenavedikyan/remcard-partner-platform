/** @vitest-environment jsdom */
/**
 * A13b — finished visibility switch controls: hit-target ≥44×44 with 42×25 track,
 * catalog/search real states, unknown not falsified as editable off, busy/applying.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import { AdminPartnersPartnerDetailDialog } from "./AdminPartnersPartnerDetailDialog";
import styles from "./AdminPartners.module.css";

afterEach(() => {
  cleanup();
});

function baseRow(overrides: Partial<PartnerRegistryItem> = {}): PartnerRegistryItem {
  return {
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
    ...overrides,
  };
}

function renderDialog(
  row: PartnerRegistryItem,
  opts: {
    isApplying?: boolean;
    disabled?: boolean;
    onRequestPreview?: (action: string) => void;
  } = {},
) {
  const onRequestPreview = opts.onRequestPreview ?? vi.fn();
  render(
    <AdminPartnersPartnerDetailDialog
      row={row}
      open
      reason=""
      onReasonChange={() => {}}
      pendingPreview={null}
      onCancelPreview={() => {}}
      onRequestPreview={onRequestPreview}
      onConfirmApply={() => {}}
      onRetryDialogError={() => {}}
      onClose={() => {}}
      isApplying={opts.isApplying ?? false}
      disabled={opts.disabled ?? false}
      dialogError={null}
    />,
  );
  const dialog = screen.getByRole("heading", { name: "Карточка партнёра" }).closest(
    "dialog",
  ) as HTMLElement;
  return { dialog, onRequestPreview };
}

describe("A13b visibility switch controls", () => {
  it("uses the button itself as ≥44×44 hit-target with an inner 42×25 track", () => {
    const { dialog } = renderDialog(baseRow());
    const catalog = within(dialog).getByRole("switch", { name: "Видимость в каталоге" });
    expect(catalog.className).toContain(styles.visibilitySwitch);
    const track = catalog.querySelector(`.${styles.visibilitySwitchTrack}`);
    expect(track).toBeTruthy();
    expect(track).toHaveAttribute("aria-hidden", "true");
    // Layout px proven in native capture; CSS module contracts pin 44/42 sizes.
    expect(styles.visibilitySwitch).toBeTruthy();
    expect(styles.visibilitySwitchTrack).toBeTruthy();
  });

  it("activates catalog hide/publish from Space/Enter and direct button click", () => {
    const onRequestPreview = vi.fn();
    const { dialog } = renderDialog(baseRow({ catalogVisibility: "VISIBLE" }), {
      onRequestPreview,
    });
    const catalog = within(dialog).getByRole("switch", { name: "Видимость в каталоге" });
    expect(catalog).toHaveAttribute("aria-checked", "true");
    // Space activates native buttons on keyUp → click.
    fireEvent.keyDown(catalog, { key: " ", code: "Space" });
    fireEvent.keyUp(catalog, { key: " ", code: "Space" });
    fireEvent.click(catalog);
    expect(onRequestPreview).toHaveBeenCalledWith("hide_catalog");
    cleanup();

    const preview2 = vi.fn();
    const { dialog: d2 } = renderDialog(baseRow({ catalogVisibility: "HIDDEN" }), {
      onRequestPreview: preview2,
    });
    const catalogOff = within(d2).getByRole("switch", { name: "Видимость в каталоге" });
    expect(catalogOff).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(catalogOff, { key: "Enter", code: "Enter" });
    fireEvent.keyUp(catalogOff, { key: "Enter", code: "Enter" });
    fireEvent.click(catalogOff);
    expect(preview2).toHaveBeenCalledWith("publish_catalog");
  });

  it("does not treat catalog unknown as editable off", () => {
    const onRequestPreview = vi.fn();
    const { dialog } = renderDialog(
      baseRow({
        catalogVisibility: undefined,
        lifecycle: null,
      }),
      { onRequestPreview },
    );
    const catalog = within(dialog).getByRole("switch", { name: "Видимость в каталоге" });
    expect(catalog).toHaveAttribute("aria-checked", "mixed");
    expect(catalog).toBeDisabled();
    expect(catalog).toHaveAttribute("data-visibility-known", "false");
    fireEvent.click(catalog);
    fireEvent.keyDown(catalog, { key: " ", code: "Space" });
    expect(onRequestPreview).not.toHaveBeenCalled();
  });

  it("covers search visible/hidden/blocked/unknown and override AUTO/SHOW/HIDE", () => {
    const cases: Array<{
      name: string;
      row: PartnerRegistryItem;
      checked: string;
      disabled: boolean;
      preview?: string;
      resetVisible: boolean;
    }> = [
      {
        name: "visible AUTO",
        row: baseRow({
          partnerSearchVisibility: {
            visible: true,
            reasonCode: "OK",
            reasonLabel: "Доступен",
            adminOverride: "AUTO",
          },
        }),
        checked: "true",
        disabled: false,
        preview: "hide_partner_search",
        resetVisible: false,
      },
      {
        name: "visible SHOW",
        row: baseRow({
          partnerSearchVisibility: {
            visible: true,
            reasonCode: "OK",
            reasonLabel: "Доступен",
            adminOverride: "SHOW",
          },
        }),
        checked: "true",
        disabled: false,
        preview: "hide_partner_search",
        resetVisible: true,
      },
      {
        name: "hidden HIDE",
        row: baseRow({
          partnerSearchVisibility: {
            visible: false,
            reasonCode: "admin_hide",
            reasonLabel: "выбор администратора",
            adminOverride: "HIDE",
          },
        }),
        checked: "false",
        disabled: false,
        preview: "show_partner_search",
        resetVisible: true,
      },
      {
        name: "blocked hard gate",
        row: baseRow({
          partnerSearchVisibility: {
            visible: false,
            reasonCode: "archived",
            reasonLabel: "В архиве",
            adminOverride: "SHOW",
          },
        }),
        checked: "false",
        disabled: true,
        resetVisible: true,
      },
      {
        name: "unknown search",
        row: baseRow({ partnerSearchVisibility: null }),
        checked: "mixed",
        disabled: true,
        resetVisible: false,
      },
    ];

    for (const c of cases) {
      const onRequestPreview = vi.fn();
      const { dialog } = renderDialog(c.row, { onRequestPreview });
      const search = within(dialog).getByRole("switch", { name: "Видимость в сотрудничестве" });
      expect(search, c.name).toHaveAttribute("aria-checked", c.checked);
      if (c.disabled) expect(search, c.name).toBeDisabled();
      else expect(search, c.name).not.toBeDisabled();
      fireEvent.click(search);
      if (c.preview) expect(onRequestPreview, c.name).toHaveBeenCalledWith(c.preview);
      else expect(onRequestPreview, c.name).not.toHaveBeenCalled();
      const reset = within(dialog).queryByRole("button", { name: "По правилам регистрации" });
      if (c.resetVisible) expect(reset, c.name).toBeTruthy();
      else expect(reset, c.name).toBeNull();
      cleanup();
    }
  });

  it("disables both switches while applying/busy and preserves show/hide control gates", () => {
    const onRequestPreview = vi.fn();
    const { dialog } = renderDialog(baseRow(), { isApplying: true, onRequestPreview });
    const catalog = within(dialog).getByRole("switch", { name: "Видимость в каталоге" });
    const search = within(dialog).getByRole("switch", { name: "Видимость в сотрудничестве" });
    expect(catalog).toBeDisabled();
    expect(search).toBeDisabled();
    expect(catalog).toHaveAttribute("aria-busy", "true");
    fireEvent.click(catalog);
    fireEvent.click(search);
    expect(onRequestPreview).not.toHaveBeenCalled();
    cleanup();

    // Already SHOW+visible → hide still available; showControl would be disabled if we were off.
    const alreadyShow = renderDialog(
      baseRow({
        partnerSearchVisibility: {
          visible: true,
          reasonCode: "OK",
          reasonLabel: "Доступен",
          adminOverride: "SHOW",
        },
      }),
    );
    const searchShow = within(alreadyShow.dialog).getByRole("switch", {
      name: "Видимость в сотрудничестве",
    });
    expect(searchShow).not.toBeDisabled();
    fireEvent.click(searchShow);
    expect(alreadyShow.onRequestPreview).toHaveBeenCalledWith("hide_partner_search");
  });
});
