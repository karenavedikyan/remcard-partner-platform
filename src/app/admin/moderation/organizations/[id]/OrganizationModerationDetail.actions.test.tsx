/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
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

const sampleOrg = {
  id: "org1",
  name: "Demo Org",
  partnerType: "COMPANY",
  catalogStatus: "PENDING",
  catalogPublished: false,
  ownerId: "u1",
  ownerPublicId: "pub1",
  isTestPartner: true,
  profTestPublicCatalogAllowed: false,
  pendingBranchesCount: 0,
  hasSubmittedDiff: false,
  revisionToken: "rev1",
  updatedAt: new Date().toISOString(),
  submitted: {
    description: "Desc",
    storeCategories: ["wallpaper"],
    specializations: ["plumbing"],
  },
  live: { catalogPublished: false },
  publicContacts: [],
  branches: [],
};

describe("OrganizationModerationDetail actions UI", () => {
  beforeEach(() => {
    mockFetchOrg.mockReset();
    mockOrgAction.mockReset();
    mockBranchAction.mockReset();
    mockFetchOrg.mockResolvedValue({ organization: sampleOrg });
    mockOrgAction.mockResolvedValue({ ok: true });
  });

  it("does not POST when canceling approve dialog", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Одобрить заявку/i }));
    fireEvent.click(screen.getByRole("button", { name: /Отмена/i }));
    expect(mockOrgAction).not.toHaveBeenCalled();
  });

  it("single POST on approve confirm", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Одобрить заявку/i }));
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить одобрение/i }));
    await waitFor(() => expect(mockOrgAction).toHaveBeenCalledTimes(1));
    expect(mockOrgAction.mock.calls[0][1]).toBe("approve");
  });

  it("hides approve-all when zero pending branches", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Одобрить org и/i })).toBeNull();
  });

  it("shows test opt-in block without mixing into approve label only", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText(/Публикация тестового партнёра/i)).toBeInTheDocument());
  });

  it("shows field error for empty reject reason in dialog", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Отклонить заявку/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Отклонить$/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/причин/i),
    );
    expect(mockOrgAction).not.toHaveBeenCalled();
  });

  it("on 409 closes dialog and reloads org", async () => {
    mockOrgAction.mockRejectedValue(new RemcardApiError(409, "Конфликт"));
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    const loadsBefore = mockFetchOrg.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Одобрить заявку/i }));
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить одобрение/i }));
    await waitFor(() => expect(mockFetchOrg.mock.calls.length).toBeGreaterThan(loadsBefore));
    expect(screen.queryByRole("button", { name: /Подтвердить одобрение/i })).toBeNull();
    expect(mockOrgAction).toHaveBeenCalledTimes(1);
  });

  it("single POST when refresh after approve fails", async () => {
    mockFetchOrg.mockReset();
    mockFetchOrg
      .mockResolvedValueOnce({ organization: sampleOrg })
      .mockRejectedValueOnce(new Error("network"));
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await waitFor(() => expect(screen.getByText("Demo Org")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Одобрить заявку/i }));
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить одобрение/i }));
    await waitFor(() =>
      expect(screen.getByText(/Решение сохранено, но карточку не удалось обновить/i)).toBeInTheDocument(),
    );
    expect(mockOrgAction).toHaveBeenCalledTimes(1);
  });
});
