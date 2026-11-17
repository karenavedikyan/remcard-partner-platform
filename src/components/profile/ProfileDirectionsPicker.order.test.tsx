import { useState } from "react";
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
  function Harness({ initial, remountKey }: { initial: string[]; remountKey?: string }) {
    const [services, setServices] = useState<string[]>(initial);
    return (
      <ProfileDirectionsPicker
        key={remountKey}
        specialistMode
        productCategoryIds={[]}
        serviceSpecializationIds={services}
        navigatorStageIds={[]}
        primaryDirection={null}
        onChangeProducts={vi.fn()}
        onChangeServices={setServices}
        onChangeStages={vi.fn()}
        onChangePrimary={vi.fn()}
      />
    );
  }

  const gridLabels = () =>
    screen
      .getAllByRole("checkbox")
      .map((el) => el.parentElement?.textContent ?? "")
      .filter((t) => t.endsWith("service"));

  it("clicking a tile does not move it; selected rise only when the picker is opened again", async () => {
    const { unmount } = render(<Harness initial={[]} />);
    await waitFor(() => screen.getByText("Gamma service"));
    expect(gridLabels()).toEqual(["Alpha service", "Beta service", "Gamma service"]);

    fireEvent.click(screen.getByLabelText("Gamma service"));
    expect(gridLabels()).toEqual(["Alpha service", "Beta service", "Gamma service"]);
    expect((screen.getByLabelText("Gamma service") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("direction-selected-count").textContent).toContain("Выбрано: 1");
    unmount();

    render(<Harness initial={["c"]} />);
    await waitFor(() => screen.getByText("Gamma service"));
    expect(gridLabels()).toEqual(["Gamma service", "Alpha service", "Beta service"]);
  });

  it("with a non-empty search only matching tiles are shown; clearing it pins the selection on top", async () => {
    render(<Harness initial={[]} />);
    await waitFor(() => screen.getByText("Alpha service"));
    fireEvent.click(screen.getByLabelText("Beta service"));

    const search = screen.getByPlaceholderText(/двери, плитка/i);
    fireEvent.change(search, { target: { value: "alpha" } });
    expect(gridLabels()).toEqual(["Alpha service"]);
    expect(screen.getByRole("button", { name: /Убрать Услуга: Beta service/ })).toBeTruthy();

    fireEvent.change(search, { target: { value: "" } });
    expect(gridLabels()).toEqual(["Beta service", "Alpha service", "Gamma service"]);
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
