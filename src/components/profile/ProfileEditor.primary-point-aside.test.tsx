import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "./ProfileEditor";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: pushMock, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/profile",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/profile-working-save", () => ({
  persistWorkingProfileDraft: vi.fn(),
  validateWorkingProfileDraft: vi.fn(() => null),
  workingProfileMissingFields: vi.fn(() => []),
  workingProfileCabinetReady: vi.fn(() => true),
  workingProfileComplete: vi.fn(() => true),
}));

vi.mock("@/lib/profile-save", () => ({
  persistProfileDraft: vi.fn(),
  submitProfileForModerationReview: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({
    notes: [],
    organization: { id: "o1", name: "Shop", branches: [] },
    summary: { totalEmployees: 0, byRole: { MANAGER: 0, SELLER: 0, VIEWER: 0 }, pendingInvites: 0 },
    branches: [],
    myRole: "ORG_OWNER",
    viewer: { userId: "u1", isOrgOwner: true, canManageEmployeesByBranchId: {} },
  }),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/components/consent/ProfAnalyticsConsentUi", () => ({
  ProfAnalyticsConsentProfileSetting: () => null,
}));

vi.mock("./NotificationSettingsPanel", () => ({
  NotificationSettingsPanel: () => <div data-testid="notif-panel" />,
}));

vi.mock("./ProfileBranchesSection", () => ({
  ProfileBranchesSection: (props: { primaryName?: string; primaryPublished?: boolean }) => (
    <div
      data-testid="branches-section"
      data-primary-name={props.primaryName}
      data-primary-published={String(props.primaryPublished)}
    />
  ),
}));

vi.mock("./ProfileTeamSection", () => ({
  ProfileTeamSection: () => <div data-testid="team-section" />,
}));

vi.mock("./specialist/SpecialistProfileSection", () => ({
  SpecialistProfileSection: () => <div data-testid="specialist-profile-section" />,
}));

vi.mock("./specialist/SpecialistCatalogSection", () => ({
  SpecialistCatalogSection: ({ catalogPublicName }: { catalogPublicName: string }) => (
    <div data-testid="catalog-public-name">{catalogPublicName}</div>
  ),
}));

vi.mock("@/lib/specialist-r06/api", () => ({
  fetchSpecialistR06Status: () =>
    Promise.resolve({
      featureEnabled: false,
      eligible: false,
      profileComplete: false,
    }),
}));

vi.mock("@/lib/agent-profile/api", () => ({
  fetchAgentProfileStatus: () =>
    Promise.resolve({ featureEnabled: false, eligible: false, hasAgentActivity: false }),
}));

vi.mock("./ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: ({
    serviceSpecializationIds,
    productCategoryIds,
  }: {
    serviceSpecializationIds: string[];
    productCategoryIds: string[];
  }) => (
    <div
      data-testid="catalog-directions"
      data-services={serviceSpecializationIds.join(",")}
      data-products={productCategoryIds.join(",")}
    />
  ),
}));

const cabinetAccess = ownerProfileCabinetAccess();

function profileWithBranches(
  branchCount: number,
  partnerType: "STORE" | "COMPANY" | "MASTER" = "STORE",
): ProProfileResponse {
  return {
    organization: {
      id: "org-synthetic",
      name: "Синтетический магазин",
      catalogStatus: "APPROVED",
      catalogPublished: true,
      partnerType: partnerType === "MASTER" ? "STORE" : partnerType,
      branchCount,
      storeCategories: ["doors"],
      specializations: [],
    },
    programs: [],
    user: {
      id: "u1",
      publicId: "RC1",
      displayName: "Синтетический владелец",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType,
      description: null,
      catalogStatus: "APPROVED",
      isPublic: true,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: ["doors"],
      areas: [],
      website: null,
      telegram: null,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: false,
    },
  };
}

beforeEach(() => {
  mockSearchParams = new URLSearchParams("section=branches");
});

describe("ProfileEditor aside: дополнительные адреса вместо счётчика филиалов", () => {
  it("zero branches: no «Филиалов: 0», says there are no additional addresses", () => {
    render(<ProfileEditor cabinetAccess={cabinetAccess} initial={profileWithBranches(0)} />);
    const line = screen.getByTestId("aside-additional-addresses");
    expect(line).toHaveTextContent("Доп. адресов нет");
    expect(screen.queryByText(/Филиалов:/)).toBeNull();
  });

  it("several real branches are reported as additional addresses", () => {
    render(<ProfileEditor cabinetAccess={cabinetAccess} initial={profileWithBranches(2)} />);
    expect(screen.getByTestId("aside-additional-addresses")).toHaveTextContent("Доп. адреса: 2");
  });

  it("passes the organization as the primary point to the branches section", () => {
    render(
      <ProfileEditor
        cabinetAccess={cabinetAccess}
        initial={profileWithBranches(0)}
      />,
    );
    const section = screen.getByTestId("branches-section");
    expect(section.getAttribute("data-primary-name")).toBe("Синтетический магазин");
    expect(section.getAttribute("data-primary-published")).toBe("true");
  });
});

describe("ProfileEditor: подпись вкладки branches по типу партнёра", () => {
  it.each([
    ["COMPANY", "Филиалы", "Точки"],
    ["STORE", "Точки", "Филиалы"],
  ] as const)("%s: вкладка «%s», без «%s»", (partnerType, expected, other) => {
    render(<ProfileEditor cabinetAccess={cabinetAccess} initial={profileWithBranches(0, partnerType)} />);
    expect(screen.getByRole("tab", { name: expected })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: other })).toBeNull();
  });

  it("MASTER: вкладки branches нет вообще", () => {
    render(<ProfileEditor cabinetAccess={cabinetAccess} initial={profileWithBranches(0, "MASTER")} />);
    expect(screen.queryByRole("tab", { name: "Точки" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Филиалы" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Сотрудники" })).toBeInTheDocument();
  });
});
