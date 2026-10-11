import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import {
  loadRecommendationCreateDraft,
  recommendationCreateDraftKey,
  saveRecommendationCreateDraft,
} from "@/lib/recommendation-create-draft";

vi.mock("./CertificateResultView", () => ({
  CertificateResultView: () => <div data-testid="recommendation-create-success" />,
}));

vi.mock("@/lib/api-client", () => ({
  getAuthMe: vi.fn(),
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const scopeSolo = { userId: "u1", organizationId: null, branchId: null };
const scopeOrg = { userId: "u1", organizationId: "org-1", branchId: null };

const partnerRow = {
  partnershipId: "part-1",
  storeUserId: "store-1",
  storeName: "Test Store",
  displayName: "Store",
  partnerType: "STORE" as const,
  partnerCategories: ["doors"],
  city: "Город",
  isSelfScan: false,
  categories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      poolPercent: 10,
      discountPercent: 10,
      issuerPercent: 0,
      proBonusPercent: 0,
      maxDiscount: 10,
      maxBonus: 10,
      maxTotal: 10,
    },
  ],
  programReady: true,
  programMissing: [],
};

function mockPartnersReady() {
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/store/certificate/available-partners") {
      return {
        partners: [partnerRow],
        certificateRecommendationIssuerReady: true,
        certificateRecommendationIssuerMissing: [],
      };
    }
    if (path === "/api/pro/context") {
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    }
    throw new Error(`unexpected path ${path}`);
  });
}

describe("CertificateCreateForm draft scope", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "Tester" },
    } as Awaited<ReturnType<typeof getAuthMe>>);
    mockPartnersReady();
  });

  it("context error does not read or overwrite SOLO persisted draft", async () => {
    saveRecommendationCreateDraft(scopeSolo, {
      selectedKeys: ["store-1:part-1"],
      discountDrafts: { "store-1::doors": "9" },
      validityPreset: "6",
    });
    const keyBefore = sessionStorage.getItem(recommendationCreateDraftKey(scopeSolo));

    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [partnerRow],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        throw new RemcardApiError(403, "Контекст недоступен");
      }
      throw new Error(path);
    });

    render(<CertificateCreateForm />);
    await screen.findByTestId("recommendation-draft-scope-error");

    expect(sessionStorage.getItem(recommendationCreateDraftKey(scopeSolo))).toBe(keyBefore);
    expect(loadRecommendationCreateDraft(scopeSolo)?.validityPreset).toBe("6");
  });

  it("successful context restores only matching scope draft", async () => {
    saveRecommendationCreateDraft(scopeSolo, {
      selectedKeys: ["store-1:part-1"],
      discountDrafts: {},
      validityPreset: "6",
    });
    saveRecommendationCreateDraft(scopeOrg, {
      selectedKeys: [],
      discountDrafts: {},
      validityPreset: "12",
    });

    render(<CertificateCreateForm />);
    await waitFor(() =>
      expect(screen.getByTestId("recommendation-validity-preset")).toHaveValue("6"),
    );
    expect(loadRecommendationCreateDraft(scopeOrg)?.validityPreset).toBe("12");
  });

  it("first autosave after restore keeps restored validity (does not clobber with default)", async () => {
    saveRecommendationCreateDraft(scopeSolo, {
      selectedKeys: ["store-1:part-1"],
      discountDrafts: { "store-1::doors": "7" },
      validityPreset: "6",
    });

    render(<CertificateCreateForm />);
    await waitFor(() =>
      expect(screen.getByTestId("recommendation-validity-preset")).toHaveValue("6"),
    );

    await waitFor(() => {
      const loaded = loadRecommendationCreateDraft(scopeSolo);
      expect(loaded?.validityPreset).toBe("6");
      expect(loaded?.discountDrafts["store-1::doors"]).toBe("7");
    });
  });

  it("scope change resets in-memory form and does not copy draft into other scope", async () => {
    saveRecommendationCreateDraft(scopeOrg, {
      selectedKeys: ["store-1:part-1"],
      discountDrafts: { "store-1::doors": "5" },
      validityPreset: "12",
    });

    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [partnerRow],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        throw new RemcardApiError(403, "Контекст недоступен");
      }
      throw new Error(path);
    });

    const user = userEvent.setup();
    render(<CertificateCreateForm />);
    await screen.findByTestId("recommendation-draft-scope-error");
    await user.selectOptions(screen.getByTestId("recommendation-validity-preset"), "1");

    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [partnerRow],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        return {
          organization: { id: "org-1", name: "Org" },
          activeBranch: null,
          role: "OWNER",
          branches: [],
        };
      }
      throw new Error(path);
    });

    await user.click(screen.getByRole("button", { name: /Повторить загрузку контекста/i }));

    await waitFor(() =>
      expect(screen.getByTestId("recommendation-validity-preset")).toHaveValue("12"),
    );
    expect(loadRecommendationCreateDraft(scopeOrg)?.validityPreset).toBe("12");
  });
});
