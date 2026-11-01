/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { OrganizationModerationDetailClient } from "./OrganizationModerationDetailClient";

const mockFetchOrg = vi.fn();
const mockOrgAction = vi.fn();
const mockBranchAction = vi.fn();

vi.mock("@/lib/prof-admin-moderation-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-moderation-api")>();
  return {
    ...actual,
    fetchModerationOrganization: (...args: unknown[]) => mockFetchOrg(...args),
    moderationOrganizationAction: (...args: unknown[]) => mockOrgAction(...args),
    moderationBranchAction: (...args: unknown[]) => mockBranchAction(...args),
    fetchModerationOrganizationPublicPreview: vi.fn().mockResolvedValue({
      organizationRevisionToken: "rev1",
      organization: { publicContacts: [] },
      branches: [],
    }),
  };
});

vi.mock("@/lib/prof-admin-api", () => ({
  setProfTestPublicCatalogShow: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

const orgWithBranch = {
  id: "org1",
  name: "Demo Org",
  partnerType: "COMPANY",
  catalogStatus: "PENDING",
  catalogPublished: false,
  ownerId: "u1",
  ownerPublicId: "pub1",
  isTestPartner: false,
  profTestPublicCatalogAllowed: false,
  pendingBranchesCount: 1,
  hasSubmittedDiff: true,
  revisionToken: "rev1",
  updatedAt: new Date().toISOString(),
  submitted: { description: "Desc", storeCategories: ["wallpaper"], specializations: ["plumbing"] },
  live: { catalogPublished: false },
  publicContacts: [],
  branches: [
    {
      id: "br1",
      catalogStatus: "PENDING",
      revisionToken: "br-rev-1",
      hasSubmittedDiff: true,
      submitted: { name: "Филиал Центр", city: "Москва", address: "ул. Пример, 1" },
    },
  ],
};

describe("OrganizationModerationDetail branch actions UI", () => {
  beforeEach(() => {
    mockFetchOrg.mockReset();
    mockOrgAction.mockReset();
    mockBranchAction.mockReset();
    mockFetchOrg.mockResolvedValue({ organization: orgWithBranch });
    mockOrgAction.mockResolvedValue({ ok: true });
    mockBranchAction.mockResolvedValue({ ok: true });
  });

  it("does not POST when canceling branch reject dialog", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    const branchCard = document.getElementById("branch-br1");
    expect(branchCard).toBeTruthy();
    fireEvent.click(within(branchCard as HTMLElement).getByRole("button", { name: "Отклонить" }));
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(mockBranchAction).not.toHaveBeenCalled();
  });

  it("single branch approve POST scoped to branch card", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    const branchCard = document.getElementById("branch-br1");
    expect(branchCard).toBeTruthy();
    const approveBtn = within(branchCard as HTMLElement).getByRole("button", {
      name: "Одобрить филиал",
    });
    fireEvent.click(approveBtn);
    fireEvent.click(screen.getByRole("button", { name: "Одобрить", exact: true }));
    await waitFor(() => expect(mockBranchAction).toHaveBeenCalledTimes(1));
    expect(mockBranchAction.mock.calls[0][0]).toBe("br1");
    expect(mockBranchAction.mock.calls[0][1]).toBe("approve");
  });
});
