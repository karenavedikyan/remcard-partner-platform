import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnerTypeSetupFields } from "./PartnerTypeSetupFields";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "paint", label: "Краски" }],
    services: [{ kind: "service", id: "doors", label: "Двери" }],
    stages: [{ kind: "stage", id: "L1-7", label: "Инженерия" }],
  })),
}));

const baseValue = {
  publicName: "Иван",
  city: "Краснодар",
  serviceSpecializationIds: [] as string[],
  productCategoryIds: [] as string[],
  organizationName: "",
};

describe("PartnerTypeSetupFields", () => {
  it("hides navigator stages and primary in specialist setup", async () => {
    const onChange = vi.fn();
    render(
      <PartnerTypeSetupFields
        targetKind="specialist"
        copyMode="recovery"
        value={baseValue}
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId("partner-type-setup-fields")).toHaveAttribute(
      "data-partner-type-setup-copy",
      "recovery",
    );
    expect(screen.getByText(/текущего типа/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Двери")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/На каких этапах вы полезны/i)).toBeNull();
    expect(screen.queryByLabelText(/Основное направление/i)).toBeNull();
  });

  it("does not show removable product chips for specialist with saved products", async () => {
    render(
      <PartnerTypeSetupFields
        targetKind="specialist"
        value={{
          ...baseValue,
          productCategoryIds: ["doors"],
        }}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("Двери")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Товар:/i })).toBeNull();
    expect(screen.queryByText(/Товар: /)).toBeNull();
  });

  it("updates services when a specialization is toggled", async () => {
    const onChange = vi.fn();
    render(
      <PartnerTypeSetupFields targetKind="specialist" value={baseValue} onChange={onChange} />,
    );
    await waitFor(() => expect(screen.getByText("Двери")).toBeInTheDocument());
    const checkbox = screen.getByRole("checkbox", { name: /Двери/i });
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(last?.serviceSpecializationIds).toContain("doors");
  });
});
