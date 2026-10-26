import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { businessCertificatesPageCopy } from "@/lib/business-owner-certificates/copy";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/agent-r03/viewModeStorage", () => ({
  readAgentR03ViewMode: () => "list" as const,
  writeAgentR03ViewMode: vi.fn(),
}));

vi.mock("@/lib/business-owner-certificates/api", () => ({
  fetchBusinessOwnerCertificates: vi.fn(),
  patchBusinessOwnerCertificate: vi.fn(),
  deleteBusinessOwnerCertificate: vi.fn(),
  batchBusinessOwnerCertificates: vi.fn(),
}));

const certRow = {
  id: "cert-1",
  promoCode: "G1",
  displayCode: "S-G1",
  title: "Gate cert",
  userAlias: "Gate cert",
  status: "ACTIVE",
  partnerStoreName: "Store",
  categorySummary: "Двери",
  discountPercent: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedInWorkspace: false,
  hasOrders: false,
  canMutateIssuer: true,
};

function listMeta(count: number) {
  return {
    certificates: count ? [certRow] : [],
    page: 1,
    pageSize: 25,
    totalCount: count,
    totalPages: 1,
    activeCount: count,
    archivedCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    sort: "created_desc" as const,
  };
}

function renderBusiness(partnerType: "STORE" | "COMPANY") {
  return render(
    <OwnerIssuerModeProvider mode="business" businessPartnerType={partnerType}>
      <AgentCertificatesList accessMode="business" />
    </OwnerIssuerModeProvider>,
  );
}

function createButtons() {
  return within(screen.getByTestId("business-certificates-root")).getAllByRole("button", {
    name: /Создать сертификат/i,
  });
}

describe.each(["STORE", "COMPANY"] as const)("AgentCertificatesList business parity (%s)", (partnerType) => {
  const copy = businessCertificatesPageCopy({ partnerType });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("empty list: one primary create CTA, text-only empty, closed client-arrived details", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listMeta(0));
    renderBusiness(partnerType);

    await waitFor(() => {
      expect(screen.getByTestId("business-certificates-empty")).toBeVisible();
    });

    expect(createButtons()).toHaveLength(1);
    expect(screen.getByTestId("business-certificates-create-cta-wrap")).toBeInTheDocument();
    expect(screen.getByTestId("business-certificates-empty")).toHaveTextContent(copy.emptyCollection);
    expect(screen.queryByRole("button", { name: copy.createCta, hidden: false })).toBe(
      screen.getByTestId("business-certificates-create-cta"),
    );

    const details = screen.getByTestId("business-certificates-client-arrived");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByRole("link", { name: copy.verifyCertificateCta })).toHaveAttribute(
      "href",
      "/scanner",
    );
  });

  it("populated list: still one create CTA before opening builder", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listMeta(1));
    renderBusiness(partnerType);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeVisible();
    });
    expect(createButtons()).toHaveLength(1);
    expect(screen.queryByTestId("business-certificates-empty")).not.toBeInTheDocument();
  });

  it("archive tab empty: text-only empty, single intro CTA", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockImplementation(async (params) => {
      if (params?.archived) return listMeta(0);
      return listMeta(1);
    });
    const user = userEvent.setup();
    renderBusiness(partnerType);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    await user.selectOptions(screen.getByTestId("agent-r03-show-filter"), "archived");
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toHaveTextContent("В архиве пока пусто."));
    expect(createButtons()).toHaveLength(1);
  });

  it("filtered-empty: no create CTA inside empty panel", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listMeta(0));
    const user = userEvent.setup();
    renderBusiness(partnerType);
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toBeVisible());
    await user.type(screen.getByPlaceholderText(copy.searchPlaceholder), "zz-no-match");
    await waitFor(() => expect(fetchBusinessOwnerCertificates).toHaveBeenCalledTimes(2));
    expect(createButtons()).toHaveLength(1);
  });

  it("loading then loaded empty keeps single CTA", async () => {
    let resolveFetch!: (v: ReturnType<typeof listMeta>) => void;
    vi.mocked(fetchBusinessOwnerCertificates).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    renderBusiness(partnerType);
    expect(screen.queryByTestId("business-certificates-create-cta")).toBeInTheDocument();
    resolveFetch(listMeta(0));
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toBeVisible());
    expect(createButtons()).toHaveLength(1);
  });

  it("fetch error with empty list: keeps single intro create CTA (issuer shell preserves view)", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockRejectedValue(new Error("network"));
    renderBusiness(partnerType);
    await waitFor(() => expect(fetchBusinessOwnerCertificates).toHaveBeenCalled());
    expect(createButtons()).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens existing create dialog once from primary CTA", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listMeta(0));
    const user = userEvent.setup();
    renderBusiness(partnerType);
    await waitFor(() => expect(screen.getByTestId("business-certificates-create-cta")).toBeVisible());
    await user.click(screen.getByTestId("business-certificates-create-cta"));
    await waitFor(() =>
      expect(screen.getByTestId("specialist-certificate-create-dialog")).toBeVisible(),
    );
    expect(createButtons()).toHaveLength(1);
  });
});
