import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch } from "@/lib/api-client";

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
      discountPercent: 5,
      issuerPercent: 5,
      proBonusPercent: 0,
      maxDiscount: 10,
      maxBonus: 10,
      maxTotal: 10,
    },
  ],
  programReady: true,
  programMissing: [],
};

const branches = [
  { id: "br-1", name: "Центр", city: "Москва", isActive: true },
  { id: "br-2", name: "Север", city: "Москва", isActive: true },
  { id: "br-3", name: "Чужой", city: "Москва", isActive: true },
];

function mockForm(staffIssuer: { branchIds: string[]; defaultBranchId: string | null } | null) {
  vi.mocked(getAuthMe).mockResolvedValue({
    user: { id: "emp-1", role: "PRO", displayName: "Сотрудник" },
  } as Awaited<ReturnType<typeof getAuthMe>>);
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/store/certificate/available-partners") {
      return {
        partners: [partnerRow],
        certificateRecommendationIssuerReady: true,
        certificateRecommendationIssuerMissing: [],
        selfBranches: branches,
        ...(staffIssuer ? { staffIssuer } : {}),
      };
    }
    if (path === "/api/pro/context") {
      return { organization: null, activeBranch: null, role: "BRANCH_MANAGER", branches: [] };
    }
    if (path === "/api/store/certificate" && init?.method === "POST") {
      return { id: "cert-1", promoCode: "RC", qrCode: "q", status: "ACTIVE", validUntil: null, maxUsages: 0, usageCount: 0, createdAt: "2026-10-21T12:00:00.000Z" };
    }
    throw new Error(`unexpected path ${path}`);
  });
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible());
  await user.click(screen.getByTestId("specialist-certificate-create-step-1").querySelector("input[type=checkbox]")!);
  await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
  await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-2")).toBeVisible());
  const discountInput = screen.getAllByLabelText("Скидка клиенту, %")[0]!;
  await user.clear(discountInput);
  await user.type(discountInput, "5");
  await user.click(screen.getByRole("button", { name: "Создать сертификат" }));
}

function postBody() {
  const call = vi.mocked(remcardFetch).mock.calls.find((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST");
  return (call?.[1] as { body: Record<string, unknown> } | undefined)?.body;
}

describe("CertificateCreateForm: branch of an issuing employee (C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("preselects the current branch, offers only own branches and sends branchId", async () => {
    mockForm({ branchIds: ["br-1", "br-2"], defaultBranchId: "br-2" });
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    const select = await screen.findByTestId("certificate-issuer-branch-select");
    expect((select as HTMLSelectElement).value).toBe("br-2");
    const optionValues = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(optionValues).toEqual(["br-1", "br-2"]);

    await user.selectOptions(select, "br-1");
    await fillAndSubmit(user);
    await waitFor(() => expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument());
    expect(postBody()).toMatchObject({ branchId: "br-1" });
  });

  it("D5: «Филиал» is a labelled field with the form select style, not a bare inline select", async () => {
    mockForm({ branchIds: ["br-1", "br-2"], defaultBranchId: "br-1" });
    render(<CertificateCreateForm issuerUi="specialist" />);

    const select = await screen.findByLabelText("Филиал");
    expect(select.tagName).toBe("SELECT");
    expect(select.className).toMatch(/issuerBranchSelect/);
    expect(select.closest("label")?.className).toMatch(/issuerBranchField/);
    expect(select.closest("label")?.className).not.toMatch(/\bmeta\b/);
  });

  it("a single own branch is shown as text and sent as branchId", async () => {
    mockForm({ branchIds: ["br-1"], defaultBranchId: "br-1" });
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    expect(await screen.findByTestId("certificate-issuer-branch-current")).toHaveTextContent("Центр · Москва");
    expect(screen.queryByTestId("certificate-issuer-branch-select")).not.toBeInTheDocument();
    await fillAndSubmit(user);
    await waitFor(() => expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument());
    expect(postBody()).toMatchObject({ branchId: "br-1" });
  });

  it("owner flow shows no branch control and sends no branchId", async () => {
    mockForm(null);
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible());
    expect(screen.queryByTestId("certificate-issuer-branch")).not.toBeInTheDocument();
    await fillAndSubmit(user);
    await waitFor(() => expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument());
    expect(postBody()).not.toHaveProperty("branchId");
  });
});
