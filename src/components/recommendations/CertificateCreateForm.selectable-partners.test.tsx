import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch } from "@/lib/api-client";
import {
  loadRecommendationCreateDraft,
  saveRecommendationCreateDraft,
} from "@/lib/recommendation-create-draft";
import { partnerSelectionKey } from "@/lib/specialist-certificate-create-ui";
import type { AvailablePartner } from "@/lib/certificate-types";

vi.mock("./CertificateResultView", () => ({
  CertificateResultView: () => <div data-testid="recommendation-create-success" />,
}));

vi.mock("@/lib/specialist-certificates/api", () => ({
  patchSpecialistIssuerCertificate: vi.fn(),
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

function categoryRow(category: string, label: string) {
  return {
    category,
    categoryLabel: label,
    poolPercent: 10,
    discountPercent: 5,
    issuerPercent: 5,
  };
}

function eligiblePartner(
  id: string,
  storeName: string,
  category = categoryRow("doors", "Двери"),
): AvailablePartner {
  return {
    partnershipId: `part-${id}`,
    storeUserId: `store-${id}`,
    storeName,
    city: "Москва",
    isSelfScan: false,
    programReady: true,
    categories: [category],
  };
}

/** Deleted / anonymised profile shape: not program-ready, no public categories. */
const deletedProfilePartner: AvailablePartner = {
  partnershipId: "part-ghost",
  storeUserId: "store-ghost",
  storeName: "Удалённый пользователь",
  city: null,
  isSelfScan: false,
  programReady: false,
  categories: [],
  programMissing: ["city", "categories"],
};

const notReadyWithCategories: AvailablePartner = {
  ...eligiblePartner("pending", "Almost Ready"),
  programReady: false,
};

const emptyCategoriesReady: AvailablePartner = {
  ...eligiblePartner("empty", "Empty Categories Co"),
  categories: [],
  programReady: true,
};

const mixedPartnersResponse = {
  partners: [
    eligiblePartner("agent", "Agent Partner Co", categoryRow("agent", "Агент")),
    eligiblePartner("store", "Store Partner LLC", categoryRow("store", "Магазин")),
    eligiblePartner("company", "Company Partner OOO", categoryRow("company", "Компания")),
    eligiblePartner("specialist", "Specialist Partner", categoryRow("spec", "Специалист")),
    deletedProfilePartner,
    notReadyWithCategories,
    emptyCategoriesReady,
  ],
  certificateRecommendationIssuerReady: true,
  certificateRecommendationIssuerMissing: [],
};

function mockContextAndPartners(partnersPayload = mixedPartnersResponse) {
  vi.mocked(getAuthMe).mockResolvedValue({
    user: { id: "u1", role: "PRO", displayName: "Tester" },
  } as Awaited<ReturnType<typeof getAuthMe>>);
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/store/certificate/available-partners") {
      return partnersPayload;
    }
    if (path === "/api/pro/context") {
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    }
    if (path === "/api/store/certificate" && init?.method === "POST") {
      return { id: "cert-1", promoCode: "RC-1", qrCode: "qr", status: "ACTIVE" };
    }
    throw new Error(`unexpected ${path}`);
  });
}

function expectIneligibleNamesAbsent() {
  expect(screen.queryByText("Ожидают согласования")).not.toBeInTheDocument();
  expect(screen.queryByText(/ещё нельзя добавить/i)).not.toBeInTheDocument();
  expect(screen.queryByText("Удалённый пользователь")).not.toBeInTheDocument();
  expect(screen.queryByText("Almost Ready")).not.toBeInTheDocument();
  expect(screen.queryByText("Empty Categories Co")).not.toBeInTheDocument();
  expect(screen.queryByText(/профиль партнёра не готов/i)).not.toBeInTheDocument();
}

describe("CertificateCreateForm selectable partners only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("default wizard lists only eligible partners from a mixed API payload", async () => {
    mockContextAndPartners();
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Партнёры" })).toBeVisible());

    expectIneligibleNamesAbsent();
    expect(screen.getByText("Agent Partner Co")).toBeVisible();
    expect(screen.getByText("Store Partner LLC")).toBeVisible();
    expect(screen.getByText("Company Partner OOO")).toBeVisible();
    expect(screen.getByText("Specialist Partner")).toBeVisible();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.queryByRole("checkbox", { name: /disabled/i })).not.toBeInTheDocument();
  });

  it("specialist dialog lists only eligible partners from the same mixed payload", async () => {
    mockContextAndPartners();
    render(<CertificateCreateForm issuerUi="specialist" presentation="dialog" />);
    await waitFor(() =>
      expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible(),
    );

    expectIneligibleNamesAbsent();
    const step = screen.getByTestId("specialist-certificate-create-step-1");
    expect(within(step).getAllByRole("checkbox")).toHaveLength(4);
  });

  it("all-ineligible API shows empty hint and blocks submit without POST", async () => {
    const postSpy = vi.fn();
    mockContextAndPartners({
      partners: [deletedProfilePartner, notReadyWithCategories, emptyCategoriesReady],
      certificateRecommendationIssuerReady: true,
      certificateRecommendationIssuerMissing: [],
    });
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [deletedProfilePartner, notReadyWithCategories, emptyCategoriesReady],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
      }
      if (path === "/api/store/certificate" && init?.method === "POST") {
        postSpy(init.body);
        return { id: "cert-1", promoCode: "RC-1", qrCode: "qr", status: "ACTIVE" };
      }
      throw new Error(`unexpected ${path}`);
    });

    const user = userEvent.setup();
    render(<CertificateCreateForm />);
    await waitFor(() =>
      expect(
        screen.getByText(/Нет доступных партнёрств для создания документа/i),
      ).toBeVisible(),
    );
    expectIneligibleNamesAbsent();

    const submit = screen.getByRole("button", { name: "Создать рекомендацию" });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("specialist dialog keeps find/invite without submission when nothing selectable", async () => {
    mockContextAndPartners({
      partners: [deletedProfilePartner],
      certificateRecommendationIssuerReady: true,
      certificateRecommendationIssuerMissing: [],
    });
    render(<CertificateCreateForm issuerUi="specialist" presentation="dialog" />);
    await waitFor(() =>
      expect(
        screen.getByText(/Нет доступных партнёрств для создания документа/i),
      ).toBeVisible(),
    );
    expect(screen.getByRole("link", { name: "Найти или пригласить" }).getAttribute("href")).toMatch(
      /^\/partners/,
    );
    expect(screen.getByRole("button", { name: "Далее: скидки" })).toBeDisabled();
  });

  it("eligible selection reaches POST with unchanged partner payload shape", async () => {
    let postedBody: unknown;
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "Tester" },
    } as Awaited<ReturnType<typeof getAuthMe>>);
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/store/certificate/available-partners") {
        return { partners: [eligiblePartner("store", "Store Partner LLC")], certificateRecommendationIssuerReady: true, certificateRecommendationIssuerMissing: [] };
      }
      if (path === "/api/pro/context") {
        return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
      }
      if (path === "/api/store/certificate" && init?.method === "POST") {
        postedBody = init.body;
        return { id: "cert-1", promoCode: "RC-1", qrCode: "qr", status: "ACTIVE" };
      }
      throw new Error(`unexpected ${path}`);
    });

    const user = userEvent.setup();
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByText("Store Partner LLC")).toBeVisible());
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Создать рекомендацию" }));

    await waitFor(() => expect(postedBody).toBeTruthy());
    const body = postedBody as { partners: Array<{ storeUserId: string; categories: unknown[] }> };
    expect(body.partners).toHaveLength(1);
    expect(body.partners[0]?.storeUserId).toBe("store-store");
    expect(body.partners[0]?.categories.length).toBeGreaterThan(0);
  });

  it("reconciles stale draft partner keys before submit payload is built", async () => {
    const eligible = eligiblePartner("ok", "Eligible Only");
    const ghostKey = partnerSelectionKey(deletedProfilePartner);
    saveRecommendationCreateDraft(scopeSolo, {
      selectedKeys: [ghostKey, partnerSelectionKey(eligible)],
      discountDrafts: {},
      validityPreset: "3",
    });

    let postedBody: unknown;
    mockContextAndPartners({
      partners: [eligible, deletedProfilePartner],
      certificateRecommendationIssuerReady: true,
      certificateRecommendationIssuerMissing: [],
    });
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [eligible, deletedProfilePartner],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
      }
      if (path === "/api/store/certificate" && init?.method === "POST") {
        postedBody = init.body;
        return { id: "cert-1", promoCode: "RC-1", qrCode: "qr", status: "ACTIVE" };
      }
      throw new Error(`unexpected ${path}`);
    });

    const user = userEvent.setup();
    render(<CertificateCreateForm />);
    await waitFor(() => expect(screen.getByText("Eligible Only")).toBeVisible());
    expectIneligibleNamesAbsent();

    await waitFor(() => {
      const draft = loadRecommendationCreateDraft(scopeSolo);
      expect(draft?.selectedKeys).toEqual([partnerSelectionKey(eligible)]);
    });

    await user.click(screen.getByRole("button", { name: "Создать рекомендацию" }));
    await waitFor(() => expect(postedBody).toBeTruthy());
    const body = postedBody as { partners: Array<{ storeUserId: string }> };
    expect(body.partners.map((p) => p.storeUserId)).toEqual(["store-ok"]);
  });
});
