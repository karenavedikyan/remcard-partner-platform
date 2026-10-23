import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { THEME_CONTRAST_PAIRS, contrastRatio } from "@/lib/theme-contrast";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "doors", label: "Монтаж дверей" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

describe("ProfileDirectionsPicker", () => {
  it("chip and lead token pairs meet WCAG contrast on light and dark surfaces", () => {
    for (const theme of ["light", "dark"] as const) {
      const chip = THEME_CONTRAST_PAIRS[theme].profileDirectionsChip;
      const lead = THEME_CONTRAST_PAIRS[theme].profileDirectionsLead;
      expect(contrastRatio(chip.fg, chip.bg)).toBeGreaterThanOrEqual(chip.minRatio);
      expect(contrastRatio(lead.fg, lead.bg)).toBeGreaterThanOrEqual(lead.minRatio);
    }
  });

  it("keeps Russian labels on chips when filter hides options", async () => {
    const onProducts = vi.fn();
    render(
      <ProfileDirectionsPicker
        productCategoryIds={["doors"]}
        serviceSpecializationIds={[]}
        navigatorStageIds={[]}
        primaryDirection={null}
        onChangeProducts={onProducts}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Убрать Товар: Двери/i })).toBeTruthy(),
    );
    fireEvent.change(screen.getByPlaceholderText(/двери, плитка/i), {
      target: { value: "zzzz-no-match" },
    });
    expect(screen.getByText(/Товар: Двери ×/)).toBeTruthy();
  });

  it("shows renovation stages for business org catalog mode", async () => {
    render(
      <ProfileDirectionsPicker
        catalogMode
        businessTabbedPick
        catalogGroupedDetails
        productCategoryIds={["doors"]}
        serviceSpecializationIds={[]}
        navigatorStageIds={[]}
        primaryDirection={null}
        onChangeProducts={vi.fn()}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: /Инженерия/i })).toBeInTheDocument(),
    );
  });

  it("defaults presentationVariant to default without specialistWorkingProfile class", async () => {
    const { container } = render(
      <ProfileDirectionsPicker
        productCategoryIds={[]}
        serviceSpecializationIds={[]}
        navigatorStageIds={[]}
        primaryDirection={null}
        onChangeProducts={vi.fn()}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />,
    );
    await waitFor(() => expect(container.querySelector('[data-direction-picker-variant="default"]')).toBeTruthy());
    expect(container.querySelector('[class*="specialistWorkingProfile"]')).toBeNull();
  });

  it("applies specialistWorkingProfile variant when requested", async () => {
    const { container } = render(
      <ProfileDirectionsPicker
        productCategoryIds={[]}
        serviceSpecializationIds={[]}
        navigatorStageIds={[]}
        primaryDirection={null}
        specialistMode
        tileLayout
        presentationVariant="specialistWorkingProfile"
        onChangeProducts={vi.fn()}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-direction-picker-variant="specialistWorkingProfile"]')).toBeTruthy(),
    );
  });

  it("uses default checkbox layout unless tileLayout is enabled", async () => {
    const { container } = render(
      <ProfileDirectionsPicker
        productCategoryIds={[]}
        serviceSpecializationIds={[]}
        navigatorStageIds={[]}
        primaryDirection={null}
        onChangeProducts={vi.fn()}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />,
    );
    await waitFor(() => expect(container.querySelector('[data-direction-picker-layout="default"]')).toBeTruthy());
  });

  it("clears primary when removing product chip", async () => {
    const onPrimary = vi.fn();
    const onProducts = vi.fn();
    render(
      <ProfileDirectionsPicker
        productCategoryIds={["doors"]}
        serviceSpecializationIds={[]}
        navigatorStageIds={[]}
        primaryDirection={{ kind: "product", id: "doors" }}
        onChangeProducts={onProducts}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={onPrimary}
      />,
    );
    await waitFor(() => screen.getByText(/Товар: Двери ×/));
    fireEvent.click(screen.getByRole("button", { name: /Убрать Товар: Двери/i }));
    expect(onProducts).toHaveBeenCalledWith([]);
    expect(onPrimary).toHaveBeenCalledWith(null);
  });
});
