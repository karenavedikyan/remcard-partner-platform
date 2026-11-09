import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import type { ProProfileResponse } from "@/lib/types";
import type { PartnerSideProfile } from "@/lib/partnership-rules";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async () => ({ invites: [] })),
  RemcardApiError: class extends Error {},
}));

const emptyClientProfile: ProProfileResponse = {
  user: {
    id: "client-sergey",
    role: "CLIENT",
    partnerType: null,
    partnerActivities: [],
    storeCategories: [],
    specializations: [],
    displayName: "Sergey",
    city: null,
    photoUrl: null,
    badges: [],
    workingProductCategoryIds: [],
    workingServiceSpecializationIds: [],
    workingNavigatorStageIds: [],
    storeWorkingHours: null,
    isPublic: false,
    publicId: null,
  },
  organization: null,
};

const threeCategoryInviter: PartnerSideProfile = {
  id: "owner-pro",
  partnerType: "COMPANY",
  partnerActivities: ["COMPANY"],
  storeCategories: ["doors", "flooring", "handles"],
  specializations: [],
  isStoreOwner: false,
};

describe("PartnerLinkInvitePanel category percent fields", () => {
  it("assigns unique ids and label associations per category", async () => {
    const user = userEvent.setup();
    render(
      <PartnerLinkInvitePanel
        meProfile={emptyClientProfile}
        inviterSide={threeCategoryInviter}
        wizard
        showSectionTitle={false}
      />,
    );

    await user.type(screen.getByLabelText(/Имя или название партнёра/i), "Test");
    await user.selectOptions(screen.getByRole("combobox", { name: /Предполагаемый тип партнёра/i }), "MASTER");
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));

    const inputs = screen.getAllByLabelText("Общий процент по категории");
    expect(inputs).toHaveLength(3);
    const ids = inputs.map((el) => el.id);
    expect(new Set(ids).size).toBe(3);
    for (const input of inputs) {
      expect(input.id.length).toBeGreaterThan(0);
      const label = document.querySelector(`label[for="${input.id}"]`);
      expect(label).toBeTruthy();
      expect(label?.textContent).toMatch(/Общий процент по категории/);
    }
  });
});
