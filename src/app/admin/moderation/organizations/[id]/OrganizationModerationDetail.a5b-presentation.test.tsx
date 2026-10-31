import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const api = vi.hoisted(() => ({
  fetchModerationOrganization: vi.fn(),
  moderationOrganizationAction: vi.fn(),
  moderationBranchAction: vi.fn(),
  fetchModerationOrganizationPublicPreview: vi.fn(),
  setProfTestPublicCatalogShow: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("status=pending&q=demo"),
}));

vi.mock("@/lib/prof-admin-moderation-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-moderation-api")>();
  return {
    ...actual,
    fetchModerationOrganization: api.fetchModerationOrganization,
    moderationOrganizationAction: api.moderationOrganizationAction,
    moderationBranchAction: api.moderationBranchAction,
    fetchModerationOrganizationPublicPreview: api.fetchModerationOrganizationPublicPreview,
  };
});

vi.mock("@/lib/prof-admin-api", () => ({
  setProfTestPublicCatalogShow: api.setProfTestPublicCatalogShow,
}));

import { OrganizationModerationDetailClient } from "./OrganizationModerationDetailClient";

const org = {
  id: "org1",
  name: "Очень длинное название организации для проверки переноса строки на узкой карточке",
  partnerType: "COMPANY",
  catalogStatus: "PENDING",
  catalogPublished: false,
  ownerId: "u1",
  ownerPublicId: "pub-org-1",
  isTestPartner: false,
  profTestPublicCatalogAllowed: null,
  pendingBranchesCount: 1,
  hasSubmittedDiff: false,
  revisionToken: "rev-1",
  updatedAt: new Date().toISOString(),
  submitted: {
    description: "Описание заявки",
    logoUrl: null,
    storeCategories: ["furniture"],
    specializations: [],
    navigatorStageIds: [],
    website: "https://example.test",
    telegram: "@demo",
    publicEmail: "a@b.test",
    publicPhone: "+79991234567",
  },
  live: { catalogPublished: false },
  publicContacts: [],
  branches: [
    {
      id: "br1",
      catalogStatus: "PENDING",
      revisionToken: "br-rev-1",
      submitted: {
        name: "Филиал Север с очень длинным названием для переноса",
        city: "Санкт-Петербург",
        address: "Невский проспект, 1",
        workingHours: "10:00–20:00",
        description: null,
        photoUrl: null,
      },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchModerationOrganization.mockResolvedValue({ organization: org });
  api.moderationOrganizationAction.mockResolvedValue({ ok: true });
  api.moderationBranchAction.mockResolvedValue({ ok: true });
  api.fetchModerationOrganizationPublicPreview.mockResolvedValue({
    organizationRevisionToken: "rev-1",
    previewLimitation: "Только просмотр",
    isTestPartner: false,
    organization: {
      id: "org1",
      name: org.name,
      logoUrl: null,
      description: "Описание",
      website: null,
      phone: null,
      email: null,
      telegram: null,
      partnerType: "COMPANY",
      storeCategories: [],
      specializations: [],
      catalogNavigatorStageIds: [],
      publicContacts: [],
    },
    branches: [],
    cityOrder: [],
  });
});

describe("Organization moderation detail A5b presentation", () => {
  it("uses local r1 CSS module and keeps queue back-link query", async () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/moderation/organizations/[id]/OrganizationModerationDetailClient.tsx",
      ),
      "utf8",
    );
    expect(src).toContain('from "./OrganizationModerationDetail.r1.module.css"');
    expect(src).not.toContain('from "./OrganizationModerationDetail.module.css"');

    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await screen.findByRole("heading", {
      level: 1,
      name: /Очень длинное название организации/,
    });
    const back = screen.getByRole("link", { name: /Очередь модерации/ });
    expect(back.getAttribute("href")).toBe("/admin/moderation?status=pending&q=demo");
    expect(screen.getByRole("heading", { name: "Ожидает проверки" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Адреса и филиалы" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Одобрить филиал" })).toBeInTheDocument();
    const reviewLead = screen.getByRole("heading", { name: "Ожидает проверки" }).parentElement;
    expect(reviewLead?.textContent || "").toMatch(/не меняет видимость/);
    expect(reviewLead?.textContent || "").not.toMatch(/Cancel|Escape|контракт/i);
  });

  it("does not POST when canceling approve confirmation", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    const approveButtons = await screen.findAllByRole("button", { name: /Одобрить заявку/i });
    fireEvent.click(approveButtons[0]!);
    await screen.findByText("Подтвердить одобрение");
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Подтвердить одобрение" })).not.toBeInTheDocument(),
    );
    expect(api.moderationOrganizationAction).not.toHaveBeenCalled();
  });

  it("opens native preview dialog without mutation", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await screen.findByRole("button", { name: "Карточка в списке" });
    fireEvent.click(screen.getByRole("button", { name: "Карточка в списке" }));
    const dialog = await screen.findByRole("dialog", { name: "Карточка в списке каталога" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Закрыть окно" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Карточка в списке каталога" })).not.toBeInTheDocument(),
    );
    expect(api.moderationOrganizationAction).not.toHaveBeenCalled();
  });

  it("keeps branch-level actions and approve-all for pending branches", async () => {
    render(<OrganizationModerationDetailClient organizationId="org1" />);
    await screen.findByRole("heading", { name: "Адреса и филиалы" });
    expect(screen.getAllByText(/Филиал Север с очень длинным названием/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Одобрить филиал" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Одобрить организацию и 1 филиал/ })).toBeInTheDocument();
  });

  it("syncs preview close on native cancel/close while dialog is open", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/ModerationPreviewModal.tsx"),
      "utf8",
    );
    expect(src).toContain('addEventListener("cancel"');
    expect(src).toContain('addEventListener("close"');
    expect(src).not.toMatch(/preventDefault\(\)/);
    expect(src).toMatch(/addEventListener\("close", syncClosed\)[\s\S]*\}, \[open\]\)/);
    expect(src).toContain("restoreFocusRef");
    expect(src).toContain("requestClose");
    expect(src).toContain("loadGenRef");
    expect(src).toContain('from "./OrganizationModerationDetail.r1.module.css"');
    expect(src).not.toContain("useModerationModalFocusTrap");
  });

  it("does not edit shared confirm dialog or shared org CSS module", () => {
    const confirm = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.tsx"),
      "utf8",
    );
    const trap = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/useModerationModalFocusTrap.ts"),
      "utf8",
    );
    const sharedCss = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.module.css",
      ),
      "utf8",
    );
    const partnerPreview = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/moderation/partners/[id]/ModerationPartnerCatalogFullPreview.tsx",
      ),
      "utf8",
    );
    expect(confirm).toContain('from "./OrganizationModerationDetail.module.css"');
    expect(trap.length).toBeGreaterThan(20);
    expect(sharedCss).toContain(".overlay");
    expect(partnerPreview).toContain("OrganizationModerationDetail.module.css");
  });
});

describe("A5b route-scoped chrome isolation (source)", () => {
  it("adds org-detail shell without enabling partnersChrome", () => {
    const header = readFileSync(join(process.cwd(), "src/app/admin/AdminHeader.tsx"), "utf8");
    expect(header).toContain("isOrgModerationDetailPath");
    expect(header).toContain("data-moderation-org-detail-shell");
    expect(header).toContain("data-moderation-partner-detail-shell");
    expect(header).toMatch(/partnersChrome=\{partnersShell\}/);
    expect(header).not.toMatch(/partnersChrome=\{[^}]*moderation/);
    expect(header).toMatch(
      /pathname === "\/admin\/partners" \|\| pathname\.startsWith\("\/admin\/partners\/"\)/,
    );
  });
});
