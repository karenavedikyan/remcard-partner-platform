import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { blockedPartnerHref } from "./BlockedPartnersNotice";
import { getAuthMe, remcardFetch } from "@/lib/api-client";
import type { AvailablePartner, BlockedPartner } from "@/lib/certificate-types";

vi.mock("./CertificateResultView", () => ({ CertificateResultView: () => <div /> }));
vi.mock("@/lib/specialist-certificates/api", () => ({ patchSpecialistIssuerCertificate: vi.fn() }));
vi.mock("@/lib/api-client", () => ({
  getAuthMe: vi.fn(),
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

const partner: AvailablePartner = {
  partnershipId: "row-out",
  storeUserId: "store-ok",
  storeName: "Готовый Магазин",
  city: "Москва",
  isSelfScan: false,
  programReady: true,
  categories: [
    { category: "doors", categoryLabel: "Двери", poolPercent: 0, discountPercent: 0, issuerPercent: 0, issuable: false },
    { category: "flooring", categoryLabel: "Напольные покрытия", poolPercent: 10, discountPercent: 5, issuerPercent: 5, issuable: true },
  ],
};

const blocked: BlockedPartner[] = [
  { partnerUserId: "b1", partnershipId: null, reversePartnershipId: "rev-1", storeName: "Только встречное",
    partnerType: "STORE", reason: "DIRECTION_NOT_AGREED", nextStep: "invite_reciprocal", message: "Направление не согласовано: у вас нет договорённости на выдачу этому партнёру.", status: null },
  { partnerUserId: "b2", partnershipId: "row-paused", reversePartnershipId: null, storeName: "На паузе",
    partnerType: "COMPANY", reason: "DIRECTION_PAUSED", nextStep: "resume_partnership", message: "Направление приостановлено.", status: "PAUSED" },
];

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getAuthMe).mockResolvedValue({ user: { id: "u1", role: "PRO", displayName: "T" } } as Awaited<ReturnType<typeof getAuthMe>>);
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/store/certificate/available-partners") {
      return { partners: [partner], blockedPartners: blocked, certificateRecommendationIssuerReady: true, certificateRecommendationIssuerMissing: [] };
    }
    if (path === "/api/pro/context") return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    throw new Error(`unexpected ${String(path)}`);
  });
});

describe("CertificateCreateForm directed picker", () => {
  it("explains blocked partners with reason and the right next-step link, and never lists them as selectable", async () => {
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByText("Готовый Магазин")).toBeVisible());
    const notice = screen.getByTestId("certificate-blocked-partners");
    const first = within(notice).getByTestId("certificate-blocked-b1");
    expect(first).toHaveAttribute("data-reason", "DIRECTION_NOT_AGREED");
    expect(within(first).getByRole("link", { name: "Предложить встречное партнёрство" }).getAttribute("href")).toMatch(/^\/partners/);
    const second = within(notice).getByTestId("certificate-blocked-b2");
    expect(within(second).getByRole("link", { name: "Возобновить сотрудничество" })).toHaveAttribute("href", "/partners?terms=row-paused");
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("does not render a notice when nothing is blocked", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/store/certificate/available-partners") {
        return { partners: [partner], certificateRecommendationIssuerReady: true, certificateRecommendationIssuerMissing: [] };
      }
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    });
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByText("Готовый Магазин")).toBeVisible());
    expect(screen.queryByTestId("certificate-blocked-partners")).toBeNull();
  });

  it("explains a 0% category while the positive category stays usable", async () => {
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByText("Готовый Магазин")).toBeVisible());
    await (await import("@testing-library/user-event")).default.click(screen.getAllByRole("checkbox")[0]);
    const note = await screen.findByText(/Согласовано 0%: по этой категории сертификат не выдаётся/);
    expect(note).toBeVisible();
    expect(screen.getByText(/Напольные покрытия/)).toBeVisible();
    expect(screen.getByText(/Согласованный процент:/)).toHaveTextContent("10%");
  });
});

describe("CertificateCreateForm all-zero partner", () => {
  it("keeps 0% categories (not excluded), makes the partner unselectable and explains it separately", async () => {
    const zeroPartner: AvailablePartner = {
      partnershipId: "row-zero",
      storeUserId: "store-zero",
      storeName: "Нулевой Магазин",
      city: "Москва",
      isSelfScan: false,
      programReady: true,
      categories: [
        { category: "doors", categoryLabel: "Двери", poolPercent: 0, discountPercent: 0, issuerPercent: 0, issuable: false },
        { category: "tools", categoryLabel: "Инструмент", poolPercent: 0, discountPercent: 0, issuerPercent: 0, issuable: false },
      ],
    };
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [partner, zeroPartner],
          blockedPartners: [
            { partnerUserId: "store-zero", partnershipId: "row-zero", reversePartnershipId: null, storeName: "Нулевой Магазин",
              partnerType: "STORE", reason: "NO_ISSUABLE_CATEGORIES", nextStep: "review_terms",
              message: "По всем категориям согласовано 0% — выдать сертификат нельзя. Пересмотрите условия сотрудничества.", status: "ACTIVE" },
          ],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    });
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByText("Готовый Магазин")).toBeVisible());
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    const notice = screen.getByTestId("certificate-blocked-partners");
    const item = within(notice).getByTestId("certificate-blocked-store-zero");
    expect(item).toHaveAttribute("data-reason", "NO_ISSUABLE_CATEGORIES");
    expect(within(item).getByText(/согласовано 0%/)).toBeVisible();
    expect(within(item).getByRole("link", { name: "Пересмотреть условия" })).toHaveAttribute("href", "/partners?terms=row-zero");
  });
});

describe("blockedPartnerHref", () => {
  const base = blocked[1];
  it("uses the invite entry when no row exists to open", () => {
    expect(blockedPartnerHref(blocked[0], "/partners?x=1")).toBe("/partners?x=1");
    expect(blockedPartnerHref({ ...base, nextStep: "reinvite" }, "/partners?x=1")).toBe("/partners?x=1");
  });
  it("opens the exact row otherwise", () => {
    expect(blockedPartnerHref(base, "/p")).toBe("/partners?terms=row-paused");
    expect(blockedPartnerHref({ ...base, partnershipId: null, reversePartnershipId: "r" }, "/p")).toBe("/partners?terms=r");
    expect(blockedPartnerHref({ ...base, partnershipId: null, reversePartnershipId: null, nextStep: "review_pending" }, "/p")).toBe("/partners");
  });
});
