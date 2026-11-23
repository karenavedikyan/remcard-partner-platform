import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailablePartner } from "@/lib/certificate-types";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import { RemcardApiError } from "@/lib/api-client";
import { miniAppCreateCertificate, miniAppFetchCertificateOptions } from "@/lib/mini-app/api";
import { MiniAppCertificateCreate } from "./MiniAppCertificateCreate";

vi.mock("@/lib/mini-app/api", () => ({
  miniAppFetchCertificateOptions: vi.fn(),
  miniAppCreateCertificate: vi.fn(),
}));

const baseBootstrap: MiniAppBootstrap = {
  actorUserId: "actor-1",
  role: "specialist",
  roleLabel: "Специалист",
  platform: "telegram",
  displayName: "Тест",
  entityLine: null,
  cabinetTitle: "Кабинет",
  workplaceLabel: null,
  actions: [],
  branches: [{ id: "br-1", label: "Центральный", active: true }],
  activeBranchId: "br-1",
  workplaceForbidden: false,
  workplaceForbiddenMessage: null,
  wallet: { status: "unavailable", message: "", loadError: false },
  presentation: { cardIdentifier: null, historyHref: "/history", cardExplainer: "" },
  fullCabinetUrl: "https://prof.example",
  partnersUrl: "https://prof.example/partners",
};

function category(label: string) {
  return {
    category: label,
    categoryLabel: label,
    poolPercent: 10,
    discountPercent: 5,
    issuerPercent: 5,
    issuable: true,
  };
}

function apiPartner(id: string, name: string, cats = [category("Двери")]): AvailablePartner {
  return {
    partnershipId: `part-${id}`,
    storeUserId: `store-${id}`,
    storeName: name,
    city: "Москва",
    isSelfScan: false,
    programReady: true,
    categories: cats,
  };
}

describe("MiniAppCertificateCreate wizard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(miniAppFetchCertificateOptions).mockResolvedValue({
      partners: [apiPartner("1", "Alpha"), apiPartner("2", "Beta")],
      needsClient: true,
      needsBranch: false,
      miniOptionsBlocked: null,
      miniClients: [{ id: "client-1", displayName: "Иван" }],
      certificateRecommendationIssuerReady: true,
      certificateRecommendationIssuerMissing: [],
    });
  });

  it("specialist: two-step flow preserves draft on back from discounts", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <MiniAppCertificateCreate
        platform="telegram"
        bootstrap={baseBootstrap}
        branchId="br-1"
        onBack={() => {}}
        onCreated={onCreated}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-cert-step-partners")).toBeInTheDocument());
    await user.click(screen.getByTestId("mini-cert-partner-store-1:part-1"));
    await user.click(screen.getByTestId("mini-cert-next-discounts"));
    await waitFor(() => expect(screen.getByTestId("mini-cert-step-discounts")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Назад" }));

    const search = screen.getByTestId("mini-cert-partner-search") as HTMLInputElement;
    await user.type(search, "Beta");
    expect(screen.getByText("Beta")).toBeInTheDocument();

    vi.mocked(miniAppCreateCertificate).mockResolvedValue({
      id: "cert-1",
      promoCode: "RC-001",
      qrCode: "RC-001",
      status: "ACTIVE",
      validUntil: null,
      maxUsages: 0,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      partners: [],
    });

    await user.click(screen.getByTestId("mini-cert-next-discounts"));
    await user.click(screen.getByTestId("mini-create-submit"));

    await waitFor(() => expect(miniAppCreateCertificate).toHaveBeenCalledTimes(1));
    const [, body, idemKey] = vi.mocked(miniAppCreateCertificate).mock.calls[0];
    expect(idemKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body).toMatchObject({ agentClientId: "client-1" });
    expect(body).not.toHaveProperty("branchId");
    expect(onCreated).toHaveBeenCalled();
  });

  it("reuses idempotency key after uncertain network failure", async () => {
    const user = userEvent.setup();
    vi.mocked(miniAppCreateCertificate)
      .mockRejectedValueOnce(new RemcardApiError(0, "network"))
      .mockResolvedValueOnce({
        id: "cert-2",
        promoCode: "RC-002",
        qrCode: "RC-002",
        status: "ACTIVE",
        validUntil: null,
        maxUsages: 0,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        partners: [],
      });

    render(
      <MiniAppCertificateCreate
        platform="telegram"
        bootstrap={baseBootstrap}
        branchId="br-1"
        onBack={() => {}}
        onCreated={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-cert-step-partners")).toBeInTheDocument());
    await user.click(screen.getByTestId("mini-cert-partner-store-1:part-1"));
    await user.click(screen.getByTestId("mini-cert-next-discounts"));
    await user.click(screen.getByTestId("mini-create-submit"));
    await waitFor(() => expect(screen.getByTestId("mini-cert-uncertain-submit")).toBeInTheDocument());

    await user.click(screen.getByTestId("mini-create-submit"));
    await waitFor(() => expect(miniAppCreateCertificate).toHaveBeenCalledTimes(2));
    const firstKey = vi.mocked(miniAppCreateCertificate).mock.calls[0][2];
    const secondKey = vi.mocked(miniAppCreateCertificate).mock.calls[1][2];
    expect(firstKey).toBe(secondKey);
  });

  it("store role shows branch line and sends branchId", async () => {
    const user = userEvent.setup();
    vi.mocked(miniAppFetchCertificateOptions).mockResolvedValue({
      partners: [apiPartner("s", "Self Store")],
      needsClient: false,
      needsBranch: true,
      miniOptionsBlocked: null,
      miniClients: [],
      certificateRecommendationIssuerReady: true,
      certificateRecommendationIssuerMissing: [],
    });
    vi.mocked(miniAppCreateCertificate).mockResolvedValue({
      id: "c1",
      promoCode: "X",
      qrCode: "X",
      status: "ACTIVE",
      validUntil: null,
      maxUsages: 0,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      partners: [],
    });

    render(
      <MiniAppCertificateCreate
        platform="max"
        bootstrap={{ ...baseBootstrap, role: "store" }}
        branchId="br-1"
        onBack={() => {}}
        onCreated={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-cert-branches-line")).toHaveTextContent("Центральный"));
    const submit = await screen.findByTestId("mini-create-submit");
    await user.click(submit);
    await waitFor(() => expect(miniAppCreateCertificate).toHaveBeenCalled());
    const body = vi.mocked(miniAppCreateCertificate).mock.calls[0][1];
    expect(body).toMatchObject({ branchId: "br-1" });
  });

  it("surfaces pool over-limit before submit", async () => {
    const user = userEvent.setup();

    render(
      <MiniAppCertificateCreate
        platform="telegram"
        bootstrap={baseBootstrap}
        branchId="br-1"
        onBack={() => {}}
        onCreated={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-cert-step-partners")).toBeInTheDocument());
    await user.click(screen.getByTestId("mini-cert-partner-store-1:part-1"));
    await user.click(screen.getByTestId("mini-cert-next-discounts"));
    const discountRow = screen.getByTestId("mini-cert-category-store-1::Двери");
    const input = within(discountRow).getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "11");
    await user.click(screen.getByTestId("mini-create-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("mini-cert-submit-error")).toHaveTextContent(/Исправьте условия|Согласовано/i),
    );
    expect(miniAppCreateCertificate).not.toHaveBeenCalled();
  });

  it("surfaces server MINI_LIMIT_EXCEEDED", async () => {
    const user = userEvent.setup();
    vi.mocked(miniAppCreateCertificate).mockRejectedValue(
      new RemcardApiError(422, "Лимит пула филиала", { code: "MINI_LIMIT_EXCEEDED", error: "Лимит" }),
    );

    render(
      <MiniAppCertificateCreate
        platform="telegram"
        bootstrap={baseBootstrap}
        branchId="br-1"
        onBack={() => {}}
        onCreated={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-cert-step-partners")).toBeInTheDocument());
    await user.click(screen.getByTestId("mini-cert-partner-store-1:part-1"));
    await user.click(screen.getByTestId("mini-cert-next-discounts"));
    await user.click(screen.getByTestId("mini-create-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("mini-cert-submit-error")).toHaveTextContent(/Лимит пула|пул/i),
    );
  });
});