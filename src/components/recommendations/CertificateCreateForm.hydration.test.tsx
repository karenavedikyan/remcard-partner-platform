import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch } from "@/lib/api-client";
import {
  saveRecommendationCreateDraft,
  type RecommendationCreateDraftScope,
} from "@/lib/recommendation-create-draft";
import { partnerSelectionKey } from "@/lib/specialist-certificate-create-ui";
import type { AvailablePartner } from "@/lib/certificate-types";

vi.mock("./CertificateResultView", () => ({ CertificateResultView: () => <div /> }));
vi.mock("@/lib/specialist-certificates/api", () => ({ patchSpecialistIssuerCertificate: vi.fn() }));
vi.mock("@/lib/api-client", () => ({
  getAuthMe: vi.fn(),
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

const company: AvailablePartner = {
  partnershipId: "row-company",
  storeUserId: "company-1",
  storeName: "Компания Краски",
  city: "Москва",
  isSelfScan: false,
  programReady: true,
  categories: [
    { category: "paint", categoryLabel: "Краски", poolPercent: 7, discountPercent: 5, issuerPercent: 5, issuable: true },
  ],
};

const scope: RecommendationCreateDraftScope = { userId: "u1", organizationId: null, branchId: null };

function holdContext() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/store/certificate/available-partners") {
      return {
        partners: [company],
        blockedPartners: [],
        certificateRecommendationIssuerReady: true,
        certificateRecommendationIssuerMissing: [],
      };
    }
    if (path === "/api/pro/context") {
      await gate;
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    }
    throw new Error(`unexpected ${String(path)}`);
  });
  return release;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getAuthMe).mockResolvedValue({
    user: { id: "u1", role: "PRO", displayName: "T" },
  } as Awaited<ReturnType<typeof getAuthMe>>);
});

describe("CertificateCreateForm draft hydration timing", () => {
  it("does not offer a selectable partner before the draft scope is settled, and the first selection sticks", async () => {
    saveRecommendationCreateDraft(scope, {
      selectedKeys: [],
      discountDrafts: {},
      validityPreset: "3",
    } as never);
    const release = holdContext();
    render(<CertificateCreateForm />);

    await waitFor(() => expect(vi.mocked(remcardFetch)).toHaveBeenCalledWith("/api/pro/context"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("Загрузка партнёров…")).toBeInTheDocument();

    release();
    const box = await screen.findByRole("checkbox");
    await userEvent.click(box);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("restores a saved selection once the scope is settled", async () => {
    saveRecommendationCreateDraft(scope, {
      selectedKeys: [partnerSelectionKey(company)],
      discountDrafts: {},
      validityPreset: "3",
    } as never);
    const release = holdContext();
    render(<CertificateCreateForm />);
    release();
    expect(await screen.findByRole("checkbox")).toBeChecked();
  });

  it("keeps the form usable when the scope cannot be resolved", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/store/certificate/available-partners") {
        return { partners: [company], blockedPartners: [], certificateRecommendationIssuerReady: true, certificateRecommendationIssuerMissing: [] };
      }
      throw new Error("context down");
    });
    render(<CertificateCreateForm />);
    const box = await screen.findByRole("checkbox");
    await userEvent.click(box);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByTestId("recommendation-draft-scope-error")).toBeInTheDocument();
  });
});
