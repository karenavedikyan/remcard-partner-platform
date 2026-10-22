/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "plumbing", label: "Сантехника" }],
    stages: [],
  })),
}));

describe("ProfileDirectionsPicker business tabs", () => {
  it("shows one direction group at a time when businessTabbedPick is set", async () => {
    const user = userEvent.setup();
    render(
      <ProfileDirectionsPicker
        tileLayout
        businessTabbedPick
        omitLead
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
      expect(screen.getByTestId("business-direction-group-tabs")).toBeTruthy(),
    );
    expect(screen.getByRole("checkbox", { name: "Двери" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Сантехника" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Работы и услуги" }));
    expect(screen.queryByRole("checkbox", { name: "Двери" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Сантехника" })).toBeTruthy();

    const tabs = screen.getByTestId("business-direction-group-tabs");
    const search = screen.getByTestId("pw-search");
    expect(
      tabs.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
