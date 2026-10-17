import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [],
    services: [
      { kind: "service", id: "a", label: "Alpha service" },
      { kind: "service", id: "b", label: "Beta service" },
      { kind: "service", id: "c", label: "Gamma service" },
    ],
    stages: [
      { kind: "stage", id: "s1", label: "Stage one" },
      { kind: "stage", id: "s2", label: "Stage two" },
    ],
  })),
}));

describe("ProfileDirectionsPicker ordering", () => {
  it("keeps selected services first under filter without dropping selection", async () => {
    render(
      <ProfileDirectionsPicker
        specialistMode
        productCategoryIds={[]}
        serviceSpecializationIds={["c"]}
        navigatorStageIds={[]}
        primaryDirection={null}
        onChangeProducts={vi.fn()}
        onChangeServices={vi.fn()}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />,
    );
    await waitFor(() => screen.getByText("Gamma service"));
    const search = screen.getByPlaceholderText(/двери, плитка/i);
    fireEvent.change(search, { target: { value: "alpha" } });
    expect(screen.getByText("Gamma service")).toBeTruthy();
    expect(screen.getByText("Alpha service")).toBeTruthy();
  });

  it("renders advanced collapse when collapseAdvancedDirections is set", async () => {
    render(
      <ProfileDirectionsPicker
        specialistMode
        collapseAdvancedDirections
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
    await waitFor(() =>
      expect(screen.getByTestId("direction-advanced-collapse")).toBeTruthy(),
    );
  });
});
