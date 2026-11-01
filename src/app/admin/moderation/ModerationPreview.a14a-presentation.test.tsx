/** @vitest-environment jsdom */
/**
 * A14a: moderation catalog preview dialog footer presentation (org + partner modals).
 * Maps R1 dialog-footer surface + A5c confirm narrow full-width dismiss; no preview engine changes.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModerationPreviewModal } from "./organizations/[id]/ModerationPreviewModal";
import { PartnerModerationPreviewModal } from "./partners/[id]/PartnerModerationPreviewModal";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";
import type { ModerationPartnerDetail } from "@/lib/prof-admin-moderation-partner-display";

const ORG_CSS = path.join(
  __dirname,
  "organizations/[id]/OrganizationModerationDetail.r1.module.css",
);
const PARTNER_CSS = path.join(__dirname, "partners/[id]/PartnerModerationDetail.module.css");
const ORG_PREVIEW = path.join(__dirname, "organizations/[id]/ModerationPreviewModal.tsx");
const PARTNER_PREVIEW = path.join(__dirname, "partners/[id]/PartnerModerationPreviewModal.tsx");

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function a14aRegion(cssText: string) {
  const start = cssText.indexOf("A14a:");
  expect(start).toBeGreaterThanOrEqual(0);
  return cssText.slice(start);
}

const orgSample = {
  id: "org1",
  name: "Synthetic org preview",
  partnerType: "COMPANY",
  revisionToken: "rev-org",
  catalogStatus: "PENDING",
  isTestPartner: false,
  submitted: {},
  live: {},
  branches: [],
} as ModerationOrgDetail;

const partnerSample = {
  id: "u1",
  publicId: "RC-1",
  partnerType: "MASTER",
  catalogStatus: "PENDING",
  isTestPartner: false,
  revisionToken: "rev-p",
  submitted: { displayName: "Partner" },
  live: {},
} as ModerationPartnerDetail;

describe("Moderation preview A14a footer presentation contract", () => {
  it("keeps preview modal sources on whitelist CSS imports only", () => {
    const orgSrc = readFileSync(ORG_PREVIEW, "utf8");
    const partnerSrc = readFileSync(PARTNER_PREVIEW, "utf8");
    expect(orgSrc).toContain("OrganizationModerationDetail.r1.module.css");
    expect(partnerSrc).toContain("PartnerModerationDetail.module.css");
    expect(orgSrc).not.toContain("useModerationModalFocusTrap");
    expect(partnerSrc).not.toContain("useModerationModalFocusTrap");
  });

  it("pins A14a appendix in org and partner preview CSS", () => {
    const orgCss = readFileSync(ORG_CSS, "utf8");
    const partnerCss = readFileSync(PARTNER_CSS, "utf8");
    const orgA14a = a14aRegion(orgCss);
    const partnerA14a = a14aRegion(partnerCss);
    expect(orgA14a).toMatch(/\.previewFooter[\s\S]*background:\s*var\(--om-surface\)/);
    expect(orgA14a).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.previewFooter button[\s\S]*width:\s*100%/);
    expect(partnerA14a).toMatch(/\.previewFooter[\s\S]*background:\s*var\(--pm-surface\)/);
    expect(partnerA14a).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.previewFooter button[\s\S]*width:\s*100%/);
    expect(sha256(orgA14a)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256(partnerA14a)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("renders native preview dialogs with footer dismiss control", () => {
    const { unmount: unmountOrg } = render(
      <ModerationPreviewModal open mode="list" org={orgSample} onClose={() => {}} />,
    );
    expect(screen.getByRole("dialog", { name: "Карточка в списке каталога" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
    unmountOrg();

    render(
      <PartnerModerationPreviewModal open mode="list" partner={partnerSample} onClose={() => {}} />,
    );
    expect(screen.getByRole("dialog", { name: "Карточка в списке каталога" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
  });
});
