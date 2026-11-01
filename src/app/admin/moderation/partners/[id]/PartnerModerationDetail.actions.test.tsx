/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { PartnerModerationDetailClient } from "./PartnerModerationDetailClient";

const mockFetchPartner = vi.fn();
const mockPartnerAction = vi.fn();

vi.mock("@/lib/prof-admin-moderation-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-moderation-api")>();
  return {
    ...actual,
    fetchModerationPartner: (...args: unknown[]) => mockFetchPartner(...args),
    moderationPartnerAction: (...args: unknown[]) => mockPartnerAction(...args),
    fetchModerationPartnerPublicPreview: vi.fn().mockResolvedValue({
      partnerRevisionToken: "rev1",
      profile: {},
    }),
  };
});

vi.mock("@/lib/prof-admin-api", () => ({
  setProfTestPublicCatalogShow: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

const samplePartner = {
  id: "u1",
  publicId: "P-1",
  partnerType: "STORE",
  catalogStatus: "PENDING",
  isPublic: false,
  isTestPartner: false,
  profTestPublicCatalogAllowed: null,
  rejectionReason: null,
  hasSubmittedDiff: true,
  revisionToken: "rev1",
  updatedAt: new Date().toISOString(),
  submitted: {
    displayName: "Partner Demo",
    city: "Москва",
    description: "Desc",
    storeCategories: ["wallpaper"],
  },
  live: { displayName: "Old", city: "Москва", isPublic: false },
  portfolioItems: [],
  services: [],
  moderationNotes: [],
};

describe("PartnerModerationDetail actions UI", () => {
  beforeEach(() => {
    mockFetchPartner.mockReset();
    mockPartnerAction.mockReset();
    mockFetchPartner.mockResolvedValue({ partner: samplePartner });
    mockPartnerAction.mockResolvedValue({ ok: true });
  });

  it("does not POST when canceling reject dialog", async () => {
    render(<PartnerModerationDetailClient partnerId="u1" />);
    await waitFor(() => expect(screen.getByText("Partner Demo")).toBeInTheDocument());
    const review = screen.getByRole("region", { name: "Ожидает проверки" });
    fireEvent.click(within(review).getByRole("button", { name: "Отклонить заявку" }));
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(mockPartnerAction).not.toHaveBeenCalled();
  });

  it("shows field error for empty reject reason without POST", async () => {
    render(<PartnerModerationDetailClient partnerId="u1" />);
    await waitFor(() => expect(screen.getByText("Partner Demo")).toBeInTheDocument());
    const review = screen.getByRole("region", { name: "Ожидает проверки" });
    fireEvent.click(within(review).getByRole("button", { name: "Отклонить заявку" }));
    fireEvent.click(screen.getByRole("button", { name: "Отклонить", exact: true }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/причин/i));
    expect(mockPartnerAction).not.toHaveBeenCalled();
  });

  it("single POST on approve confirm", async () => {
    render(<PartnerModerationDetailClient partnerId="u1" />);
    await waitFor(() => expect(screen.getByText("Partner Demo")).toBeInTheDocument());
    const review = screen.getByRole("region", { name: "Ожидает проверки" });
    fireEvent.click(within(review).getByRole("button", { name: "Одобрить заявку" }));
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить одобрение" }));
    await waitFor(() => expect(mockPartnerAction).toHaveBeenCalledTimes(1));
    expect(mockPartnerAction.mock.calls[0][1]).toBe("approve");
  });
});
