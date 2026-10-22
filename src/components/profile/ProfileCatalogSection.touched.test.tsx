import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { markCatalogFieldTouched } from "@/lib/specialist-r06/catalog-prefill";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "plumbing", label: "Сантехника" }],
    stages: [],
  })),
}));

/** Mirrors ProfileEditor onStoreCategoriesChange: update ids + mark manual edit. */
function storeCategoriesChangeHandler(
  setIds: (ids: string[]) => void,
  setTouched: (next: ReturnType<typeof markCatalogFieldTouched>) => void,
  touched: ReturnType<typeof markCatalogFieldTouched>,
) {
  return (ids: string[]) => {
    setIds(ids);
    setTouched(markCatalogFieldTouched(touched, "storeCategories"));
  };
}

describe("ProfileCatalogSection storeCategories touched wiring", () => {
  it("clearing the last public product marks storeCategories touched", async () => {
    let ids = ["doors"];
    let touched = {};
    const onProducts = storeCategoriesChangeHandler(
      (next) => {
        ids = next;
      },
      (next) => {
        touched = next;
      },
      touched,
    );

    render(
      <ProfileDirectionsPicker
        catalogMode
        productCategoryIds={ids}
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
    fireEvent.click(screen.getByRole("button", { name: /Убрать Товар: Двери/i }));

    expect(ids).toEqual([]);
    expect(touched).toEqual({ storeCategories: true });
  });
});
