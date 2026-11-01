/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  OrganizationModerationHistorySection,
  PartnerModerationHistorySection,
} from "./ModerationDetailHistorySections";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";
import type { ModerationPartnerDetail } from "@/lib/prof-admin-moderation-partner-display";

const stubStyles = {
  section: "section",
  metaLine: "meta",
  dataGrid: "grid",
  prose: "prose",
  historyList: "list",
  historyItem: "item",
};

const orgStub: ModerationOrgDetail = {
  id: "o1",
  name: "Org",
  partnerType: "COMPANY",
  catalogStatus: "PENDING",
  catalogPublished: false,
  ownerId: "u1",
  ownerPublicId: "RC-1",
  isTestPartner: false,
  profTestPublicCatalogAllowed: null,
  pendingBranchesCount: 0,
  hasSubmittedDiff: true,
  revisionToken: "r1",
  submitted: {},
  live: { catalogPublished: false },
  publicContacts: [],
  branches: [],
};

const partnerStub: ModerationPartnerDetail = {
  id: "p1",
  publicId: "P-1",
  partnerType: "MASTER",
  catalogStatus: "REJECTED",
  isPublic: false,
  isTestPartner: false,
  profTestPublicCatalogAllowed: null,
  rejectionReason: "Причина отказа длинная для переноса строки без обрезки смысла",
  hasSubmittedDiff: true,
  revisionToken: "r1",
  submitted: { displayName: "Demo" },
  live: { isPublic: false },
  portfolioItems: [],
  services: [],
  moderationNotes: [
    {
      id: "n1",
      comment: "Комментарий модератора с длинным текстом",
      createdAt: "2026-01-01T12:00:00.000Z",
      resolvedAt: null,
    },
  ],
};

describe("Moderation detail completion (A18c history presentation)", () => {
  it("org history avoids API/prototype technical copy", () => {
    render(<OrganizationModerationHistorySection org={orgStub} styles={stubStyles} />);
    expect(screen.getByRole("heading", { name: "История проверки" })).toBeInTheDocument();
    expect(screen.getByText(/недоступна/i)).toBeInTheDocument();
    expect(screen.queryByText(/API/i)).toBeNull();
    expect(screen.queryByText(/прототип/i)).toBeNull();
    expect(screen.getByText("На проверке")).toBeInTheDocument();
  });

  it("partner history shows GET fields without inventing timeline", () => {
    render(<PartnerModerationHistorySection partner={partnerStub} styles={stubStyles} />);
    expect(screen.getByText(/Последняя причина отказа/i)).toBeInTheDocument();
    expect(screen.getByText(partnerStub.rejectionReason!)).toBeInTheDocument();
    expect(screen.getByText(/Комментарий модератора/i)).toBeInTheDocument();
    expect(screen.getByText("Отклонено")).toBeInTheDocument();
  });

  it("partner empty history uses honest empty copy", () => {
    render(
      <PartnerModerationHistorySection
        partner={{ ...partnerStub, rejectionReason: null, moderationNotes: [] }}
        styles={stubStyles}
      />,
    );
    expect(screen.getByText(/Записей о прошлых решениях пока нет/i)).toBeInTheDocument();
  });
});
