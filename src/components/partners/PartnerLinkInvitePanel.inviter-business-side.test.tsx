import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import type { ProProfileResponse } from "@/lib/types";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
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

describe("PartnerLinkInvitePanel inviterBusinessSide from link-invite GET", () => {
  it("uses trusted principal categories when pro/context organization slice is sparse", async () => {
    const user = userEvent.setup();
    remcardFetch.mockResolvedValue({
      invites: [],
      inviterBusinessSide: {
        principalUserId: "owner-pro",
        partnerType: "COMPANY",
        storeCategories: ["doors"],
        specializations: [],
        tradeTermCategories: ["doors", "handles"],
      },
    });

    render(<PartnerLinkInvitePanel meProfile={emptyClientProfile} wizard showSectionTitle={false} />);

    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/Имя или название партнёра/i), "Test");
    await user.selectOptions(screen.getByRole("combobox", { name: /Предполагаемый тип партнёра/i }), "MASTER");
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));

    expect(await screen.findByTestId("link-invite-category-doors")).toBeInTheDocument();
  });
});
