import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "doors", label: "Монтаж дверей" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

describe("ProfileDirectionsPicker", () => {
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
