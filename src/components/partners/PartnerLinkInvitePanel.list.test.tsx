import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import { emptyLinkInviteList } from "@/lib/link-invite-list";
import type { ProProfileResponse } from "@/lib/types";

function storeSenderProfile(): ProProfileResponse {
  return {
    user: {
      id: "sender",
      displayName: "Оптовик",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      storeCategories: ["doors"],
      specializations: [],
    },
    organization: null,
  } as unknown as ProProfileResponse;
}

const { remcardFetch } = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch,
  RemcardApiError: class extends Error {},
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "http://127.0.0.1:4312",
}));

describe("PartnerLinkInvitePanel gallery entry", () => {
  it("opens gallery through quick entry callback", async () => {
    remcardFetch.mockResolvedValue(emptyLinkInviteList());
    const onOpen = vi.fn();
    render(
      <PartnerLinkInvitePanel
        meProfile={storeSenderProfile()}
        onOpenInvitesGallery={onOpen}
      />,
    );
    await screen.findByTestId("link-invite-open-gallery");
    fireEvent.click(screen.getByTestId("link-invite-open-gallery"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});