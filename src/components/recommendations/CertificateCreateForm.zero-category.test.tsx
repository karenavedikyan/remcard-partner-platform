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

const category = (
  key: string,
  label: string,
  pool: number,
  issuable: boolean,
): AvailablePartner["categories"][number] => ({
  category: key,
  categoryLabel: label,
  poolPercent: pool,
  discountPercent: 0,
  issuerPercent: 0,
  issuable,
});

const partner: AvailablePartner = {
  partnershipId: "part-qa",
  storeUserId: "store-qa",
  storeName: "Новая компания QA",
  city: "Краснодар",
  isSelfScan: false,
  programReady: true,
  categories: [
    category("doors", "Двери", 2, true),
    category("flooring", "Напольные покрытия", 0, false),
    category("paint", "Краски", 4, true),
  ],
};

const FLOORING = "store-qa::flooring";
const DOORS = "store-qa::doors";
const PAINT = "store-qa::paint";
const scope: RecommendationCreateDraftScope = { userId: "emp-1", organizationId: null, branchId: null };

function mockApi(partners: AvailablePartner[] = [partner], role: "PRO" | "CLIENT" = "CLIENT") {
  vi.mocked(getAuthMe).mockResolvedValue({
    user: { id: "emp-1", role, displayName: "Сотрудник" },
  } as Awaited<ReturnType<typeof getAuthMe>>);
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/store/certificate/available-partners") {
      return {
        partners,
        blockedPartners: [],
        certificateRecommendationIssuerReady: true,
        certificateRecommendationIssuerMissing: [],
      };
    }
    if (path === "/api/pro/context") {
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    }
    if (path === "/api/store/certificate" && init?.method === "POST") {
      return {
        id: "cert-1",
        promoCode: "RC",
        qrCode: "q",
        status: "ACTIVE",
        validUntil: null,
        maxUsages: 0,
        usageCount: 0,
        createdAt: "2026-11-17T12:00:00.000Z",
      };
    }
    throw new Error(`unexpected path ${String(path)}`);
  });
}

function posts() {
  return vi
    .mocked(remcardFetch)
    .mock.calls.filter((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST");
}

function postedCategories(): Array<{ category: string; discountPercent: number }> {
  const body = (posts()[0]?.[1] as { body: { partners: Array<{ categories: never[] }> } }).body;
  return body.partners.flatMap((p) => p.categories);
}

async function setDiscount(user: ReturnType<typeof userEvent.setup>, key: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(
    `[data-testid="specialist-certificate-create-step-2"] [data-testid="specialist-cert-category-${key}"]`,
  );
  expect(input).not.toBeNull();
  const field = input!.closest("[class*=categoryRow]")!.querySelector<HTMLInputElement>("input[type=number]")!;
  await user.clear(field);
  await user.type(field, value);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("C1.2: a 0% category does not block the other categories (specialist wizard)", () => {
  it("0% category is unchecked and disabled, stays explained, needs no discount; 1/1 on the others → POST without it", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible());
    await user.click(screen.getByTestId("specialist-certificate-create-step-1").querySelector("input[type=checkbox]")!);
    await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-2")).toBeVisible());

    const flooring = screen.getByTestId(`specialist-cert-category-${FLOORING}`) as HTMLInputElement;
    expect(flooring.checked).toBe(false);
    expect(flooring.disabled).toBe(true);
    expect((screen.getByTestId(`specialist-cert-category-${DOORS}`) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId(`specialist-cert-category-${PAINT}`) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId(`cert-zero-category-${FLOORING}`)).toHaveTextContent(/Согласовано 0%/);
    expect(screen.getByText("Напольные покрытия")).toBeInTheDocument();

    await setDiscount(user, DOORS, "1");
    await setDiscount(user, PAINT, "1");
    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));

    await waitFor(() => expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument());
    expect(posts()).toHaveLength(1);
    const sent = postedCategories();
    expect(sent.map((c) => c.category).sort()).toEqual(["doors", "paint"]);
    expect(sent.find((c) => c.category === "doors")?.discountPercent).toBe(1);
    expect(sent.find((c) => c.category === "paint")?.discountPercent).toBe(1);
    expect(screen.queryByText("Исправьте условия по категориям")).toBeNull();
    expect(screen.queryByText("Укажите скидку клиенту")).toBeNull();
  });

  it("allowed defaults are enough: no typing needed, still no 0% category in the POST", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);
    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible());
    await user.click(screen.getByTestId("specialist-certificate-create-step-1").querySelector("input[type=checkbox]")!);
    await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-2")).toBeVisible());
    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postedCategories().map((c) => c.category).sort()).toEqual(["doors", "paint"]);
  });

  it("a restored draft with a stale true for the 0% category does not block and is normalised", async () => {
    saveRecommendationCreateDraft(scope, {
      selectedKeys: [partnerSelectionKey(partner)],
      discountDrafts: { [DOORS]: "1", [PAINT]: "1" },
      validityPreset: "3",
      specialistStep: 2,
      selectedCategoryKeys: { [DOORS]: true, [FLOORING]: true, [PAINT]: true },
    } as never);
    mockApi();
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-2")).toBeVisible());
    const flooring = await screen.findByTestId(`specialist-cert-category-${FLOORING}`);
    await waitFor(() => expect((flooring as HTMLInputElement).checked).toBe(false));
    expect((flooring as HTMLInputElement).disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));
    await waitFor(() => expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument());
    expect(postedCategories().map((c) => c.category).sort()).toEqual(["doors", "paint"]);
  });

  it("a partner whose categories are all unavailable is still not selectable", async () => {
    const dead: AvailablePartner = {
      ...partner,
      storeUserId: "store-dead",
      storeName: "Мёртвая программа",
      categories: [category("doors", "Двери", 0, false), category("paint", "Краски", 0, false)],
    };
    mockApi([dead]);
    render(<CertificateCreateForm issuerUi="specialist" />);
    await waitFor(() => expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible());
    expect(screen.queryByText("Мёртвая программа")).toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});

describe("C1.2: default (owner) form with a 0% category", () => {
  it("sends only the issuable category; the 0% row stays explained and disabled", async () => {
    mockApi([partner], "PRO");
    const user = userEvent.setup();
    render(<CertificateCreateForm />);
    const box = await screen.findByRole("checkbox");
    await user.click(box);
    expect(screen.getAllByText(/Согласовано 0%: по этой категории сертификат не выдаётся/).length).toBeGreaterThan(0);

    const inputs = screen.getAllByLabelText("Скидка клиенту, %") as HTMLInputElement[];
    const enabled = inputs.filter((i) => !i.disabled);
    expect(enabled).toHaveLength(2);
    expect(inputs.filter((i) => i.disabled)).toHaveLength(1);
    for (const input of enabled) {
      await user.clear(input);
      await user.type(input, "1");
    }
    await user.click(screen.getByRole("button", { name: /Создать (сертификат|рекомендацию)/ }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postedCategories().map((c) => c.category).sort()).toEqual(["doors", "paint"]);
  });
});
