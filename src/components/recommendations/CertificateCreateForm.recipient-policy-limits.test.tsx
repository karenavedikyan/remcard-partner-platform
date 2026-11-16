import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch } from "@/lib/api-client";
import type { AvailablePartner } from "@/lib/certificate-types";

vi.mock("./CertificateResultView", () => ({
  CertificateResultView: () => <div data-testid="recommendation-create-success" />,
}));
vi.mock("@/lib/specialist-certificates/api", () => ({ patchSpecialistIssuerCertificate: vi.fn() }));
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

function partner(
  id: string,
  storeName: string,
  validityDays: number,
  purchaseLimit: number,
  percent: number,
): AvailablePartner {
  return {
    partnershipId: `part-${id}`,
    storeUserId: `store-${id}`,
    storeName,
    city: "Краснодар",
    isSelfScan: false,
    programReady: true,
    categories: [{ category: "paint", categoryLabel: "Краска", poolPercent: percent, discountPercent: percent, issuerPercent: 0 }],
    recipientPolicy: {
      validityDays, purchaseLimit, minimumPurchaseAmount: null, promotionsCompatible: false,
      exclusionsText: null, policySource: "general", validUntil: null,
    },
  } as AvailablePartner;
}

function mockApi() {
  vi.mocked(getAuthMe).mockResolvedValue({ user: { id: "u1", role: "PRO", displayName: "Агент" } } as Awaited<ReturnType<typeof getAuthMe>>);
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/store/certificate/available-partners") {
      return {
        partners: [partner("company", "Компания 62", 14, 1, 9), partner("store", "Магазин 56", 45, 3, 7)],
        certificateRecommendationIssuerReady: true,
        certificateRecommendationIssuerMissing: [],
        isAgentRecommender: true,
      };
    }
    if (path === "/api/pro/context") return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    throw new Error(`unexpected ${path}`);
  });
}

describe("default certificate form shows the exact recipient validity and purchases per selected partner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows 14 days / 1 purchase for Company and 45 days / 3 purchases for Store, read-only and without an issuer validity control", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Партнёры" })).toBeVisible());
    expect(screen.queryByTestId("recommendation-recipient-policy-company")).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: /Компания 62/ }));
    const company = await screen.findByTestId("recommendation-recipient-policy-store-company");
    expect(company).toHaveTextContent("Компания 62: срок скидки 14 дней · 1 покупка");
    expect(screen.getByText(/Срок и число покупок задаёт принимающий партнёр/)).toBeInTheDocument();
    expect(screen.queryByTestId("recommendation-validity-preset")).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: /Магазин 56/ }));
    const list = screen.getByTestId("recommendation-recipient-policy-list");
    expect(within(list).getByTestId("recommendation-recipient-policy-store-store")).toHaveTextContent(
      "Магазин 56: срок скидки 45 дней · 3 покупки",
    );
    expect(within(list).getByTestId("recommendation-recipient-policy-store-company")).toHaveTextContent("14 дней · 1 покупка");

    await user.click(screen.getByRole("checkbox", { name: /Компания 62/ }));
    expect(screen.queryByTestId("recommendation-recipient-policy-store-company")).toBeNull();
    expect(screen.getByTestId("recommendation-recipient-policy-store-store")).toBeInTheDocument();
  });
});
