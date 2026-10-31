import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const api = vi.hoisted(() => ({
  fetchModerationPartner: vi.fn(),
  moderationPartnerAction: vi.fn(),
  fetchModerationPartnerPublicPreview: vi.fn(),
  setProfTestPublicCatalogShow: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("status=pending&q=demo"),
}));

vi.mock("@/lib/prof-admin-moderation-api", () => ({
  fetchModerationPartner: api.fetchModerationPartner,
  moderationPartnerAction: api.moderationPartnerAction,
  fetchModerationPartnerPublicPreview: api.fetchModerationPartnerPublicPreview,
  moderationPartnerPreviewRevisionFetchKey: (p: { revisionToken: string }) => p.revisionToken,
}));

vi.mock("@/lib/prof-admin-api", () => ({
  setProfTestPublicCatalogShow: api.setProfTestPublicCatalogShow,
}));

import { PartnerModerationDetailClient } from "./PartnerModerationDetailClient";

const partner = {
  id: "u1",
  publicId: "P-1001",
  partnerType: "STORE",
  catalogStatus: "PENDING",
  isPublic: false,
  isTestPartner: false,
  profTestPublicCatalogAllowed: null,
  rejectionReason: null,
  hasSubmittedDiff: true,
  fieldDiffs: ["displayName", "city"],
  revisionToken: "rev-1",
  submitted: {
    displayName: "Очень длинное название партнёра для проверки переноса строки на узкой карточке",
    city: "Санкт-Петербург",
    description: "Описание заявки",
    photoUrl: null,
    storeCategories: ["furniture"],
    website: "https://example.test",
    telegram: "@demo",
    whatsapp: null,
    navigatorStageIds: [],
  },
  live: {
    displayName: "Старое имя",
    city: "Москва",
    description: "Live описание",
    isPublic: false,
  },
  portfolioItems: [],
  services: [],
  moderationNotes: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchModerationPartner.mockResolvedValue({ partner });
  api.moderationPartnerAction.mockResolvedValue({ ok: true });
  api.fetchModerationPartnerPublicPreview.mockResolvedValue({
    partnerRevisionToken: "rev-1",
    profile: {},
  });
});

describe("Partner moderation detail A5a presentation", () => {
  it("uses local CSS module and keeps queue back-link query", async () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/partners/[id]/PartnerModerationDetailClient.tsx"),
      "utf8",
    );
    expect(src).toContain('from "./PartnerModerationDetail.module.css"');
    expect(src).not.toContain("OrganizationModerationDetail.module.css");

    render(<PartnerModerationDetailClient partnerId="u1" />);
    await screen.findByRole("heading", {
      level: 1,
      name: /Очень длинное название партнёра/,
    });
    const back = screen.getByRole("link", { name: /Очередь модерации/ });
    expect(back.getAttribute("href")).toBe("/admin/moderation?status=pending&q=demo");
    expect(screen.getByRole("heading", { name: "Ожидает проверки" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Отправленная заявка" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Опубликовано сейчас (live)" })).toBeInTheDocument();
  });

  it("does not POST when canceling approve confirmation", async () => {
    render(<PartnerModerationDetailClient partnerId="u1" />);
    const approveButtons = await screen.findAllByRole("button", { name: "Одобрить заявку" });
    fireEvent.click(approveButtons[0]!);
    await screen.findByText("Подтвердить одобрение");
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Подтвердить одобрение" })).not.toBeInTheDocument(),
    );
    expect(api.moderationPartnerAction).not.toHaveBeenCalled();
  });

  it("opens native preview dialog without mutation", async () => {
    render(<PartnerModerationDetailClient partnerId="u1" />);
    await screen.findByRole("button", { name: "Карточка в списке" });
    fireEvent.click(screen.getByRole("button", { name: "Карточка в списке" }));
    const dialog = await screen.findByRole("dialog", { name: "Карточка в списке каталога" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Закрыть окно" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Карточка в списке каталога" })).not.toBeInTheDocument(),
    );
    expect(api.moderationPartnerAction).not.toHaveBeenCalled();
  });
});

describe("A5a route-scoped chrome isolation (source)", () => {
  it("does not enable partnersChrome for moderation partner detail", () => {
    const header = readFileSync(join(process.cwd(), "src/app/admin/AdminHeader.tsx"), "utf8");
    expect(header).toContain("isPartnerModerationDetailPath");
    expect(header).toContain("data-moderation-partner-detail-shell");
    expect(header).toMatch(/partnersChrome=\{partnersShell\}/);
    expect(header).not.toMatch(/partnersChrome=\{[^}]*moderation/);
    // Partners path detector stays partners-only
    expect(header).toMatch(
      /pathname === "\/admin\/partners" \|\| pathname\.startsWith\("\/admin\/partners\/"\)/,
    );
  });
});
