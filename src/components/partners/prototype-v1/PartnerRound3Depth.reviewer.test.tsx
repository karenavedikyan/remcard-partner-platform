/** @vitest-environment jsdom */
/**
 * Round3 depth regressions (LOCAL FIXTURE).
 * ACTIVE/outgoing deep-link segment resolution + one-shot focus after explicit close.
 * Does not weaken reviewer originals; loading checked via testid, not exact wording.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentPartnersHub } from "@/components/partners/AgentPartnersHub";
import { PartnerInviteWizard } from "./PartnerInviteWizard";
import type { Partnership, ProProfileResponse } from "@/lib/types";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";

const remcardFetch = vi.fn();
const fetchCert = vi.fn();
const searchParamsStore = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {
    status = 400;
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

vi.mock("@/lib/partner-certificate-program", () => ({
  fetchPartnerCertificateProgram: (...args: unknown[]) => fetchCert(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsStore.value,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [],
    services: [],
    stages: [],
  }),
}));

function storeProfile(): ProProfileResponse {
  return {
    user: {
      id: "me-1",
      publicId: "ME",
      displayName: "Я",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      storeCategories: ["doors"],
      description: null,
      catalogStatus: "APPROVED",
      isPublic: true,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      areas: [],
      website: null,
      telegram: null,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: true,
    },
    organization: {
      id: "org-store",
      name: "Магазин",
      catalogStatus: "APPROVED",
      partnerType: "STORE",
      branchCount: 1,
    },
    programs: [],
  };
}

function makePartnership(
  id: string,
  opts: {
    status: "ACTIVE" | "INVITED";
    initiatedBy: string;
    note: string;
  },
): Partnership {
  return {
    id,
    status: opts.status,
    initiatedBy: opts.initiatedBy,
    pendingProposedBy: null,
    note: opts.note,
    createdAt: "",
    updatedAt: "",
    storeUserId: "me-1",
    proUserId: "other",
    terms: [
      {
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 12,
        isExcluded: false,
      },
    ],
    storeUser: {
      id: "me-1",
      displayName: "Я",
      city: null,
      specializations: [],
      storeCategories: [],
      partnerType: "STORE",
      partnerActivities: ["STORE"],
    },
    proUser: {
      id: "other",
      displayName: `Партнёр ${id}`,
      city: null,
      specializations: ["painting"],
      storeCategories: [],
      partnerType: "MASTER",
      partnerActivities: ["SERVICE"],
    },
  } as Partnership;
}

function mockList(partnerships: Partnership[]) {
  remcardFetch.mockImplementation(async (path: string) => {
    const p = String(path);
    if (p.includes("/api/partnership/list")) {
      return { partnerships };
    }
    if (p.includes("/term-change")) {
      return { requests: [] };
    }
    return { partners: [], nextCursor: null };
  });
}

function renderHub(audience: PartnersHubAudience = "business-store-r04") {
  return render(
    <AgentPartnersHub
      meId="me-1"
      initialProfile={storeProfile()}
      presentationAudience={audience}
    />,
  );
}

describe("PartnerRound3Depth reviewer", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    fetchCert.mockReset();
    fetchCert.mockResolvedValue({ status: "empty" });
    searchParamsStore.value = new URLSearchParams();
  });

  for (const param of ["partnershipId", "terms"] as const) {
    it(`${param}: authorized ACTIVE row still opens after the received invitation has been accepted`, async () => {
      const wanted = "wanted-active";
      searchParamsStore.value = new URLSearchParams(`${param}=${wanted}`);
      mockList([
        makePartnership(wanted, {
          status: "ACTIVE",
          initiatedBy: "other",
          note: "Уникальные условия ACTIVE wanted",
        }),
      ]);
      renderHub();
      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Мои партнёры/i })).toHaveAttribute(
          "aria-selected",
          "true",
        );
      });
      await waitFor(() => {
        expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
      });
      expect(screen.getByTestId("partner-partnership-detail-dialog").textContent).toMatch(
        /Уникальные условия ACTIVE wanted|Партнёр wanted-active/,
      );
      expect(screen.queryByText(/Входящих приглашений пока нет/i)).not.toBeInTheDocument();
    });
  }

  it("terms: authorized outgoing invitation also resolves the exact row rather than an empty incoming list", async () => {
    const wanted = "wanted-out";
    searchParamsStore.value = new URLSearchParams(`terms=${wanted}`);
    mockList([
      makePartnership(wanted, {
        status: "INVITED",
        initiatedBy: "me-1",
        note: "Уникальные условия outgoing wanted",
      }),
    ]);
    renderHub();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Приглашения/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("agent-invites-outgoing")).toHaveAttribute("aria-selected", "true");
    });
    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-partnership-detail-dialog").textContent).toMatch(
      /Уникальные условия outgoing wanted|Партнёр wanted-out/,
    );
    expect(screen.queryByText(/Входящих приглашений пока нет/i)).not.toBeInTheDocument();
  });

  it("explicitly closing deep-linked detail stays closed when page size changes", async () => {
    const user = userEvent.setup();
    const wanted = "wanted-29";
    searchParamsStore.value = new URLSearchParams(`partnershipId=${wanted}`);
    const partnerships = Array.from({ length: 30 }, (_, i) => {
      const id = i === 29 ? wanted : `incoming-${i}`;
      return makePartnership(id, {
        status: "INVITED",
        initiatedBy: "other",
        note: `Уникальные условия ${id}`,
      });
    });
    mockList(partnerships);
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("partner-detail-close"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-partnership-detail-dialog")).not.toBeInTheDocument();
    });
    const pageSize = screen.getByLabelText(/Записей на странице/i);
    await user.selectOptions(pageSize, "50");
    expect(screen.queryByTestId("partner-partnership-detail-dialog")).not.toBeInTheDocument();
  });

  it("explicit close stays closed across list filter refresh; a different URL id opens again", async () => {
    const user = userEvent.setup();
    const first = "wanted-first";
    const second = "wanted-second";
    searchParamsStore.value = new URLSearchParams(`partnershipId=${first}`);
    mockList([
      makePartnership(first, {
        status: "INVITED",
        initiatedBy: "other",
        note: "Уникальные условия first",
      }),
      makePartnership(second, {
        status: "INVITED",
        initiatedBy: "other",
        note: "Уникальные условия second",
      }),
    ]);
    const view = renderHub();
    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-partnership-detail-dialog").textContent).toMatch(/first/);
    await user.click(screen.getByTestId("partner-detail-close"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-partnership-detail-dialog")).not.toBeInTheDocument();
    });

    // Filter/search refresh must not reopen the consumed deep-link.
    const search = screen.getByPlaceholderText(/Поиск своих партнёров/i);
    await user.type(search, "x");
    await user.clear(search);
    expect(screen.queryByTestId("partner-partnership-detail-dialog")).not.toBeInTheDocument();

    searchParamsStore.value = new URLSearchParams(`partnershipId=${second}`);
    view.rerender(
      <AgentPartnersHub
        meId="me-1"
        initialProfile={storeProfile()}
        presentationAudience="business-store-r04"
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-partnership-detail-dialog").textContent).toMatch(/second/);
  });

  it("unknown/unauthorized deep-link id does not invent a detail record from the query string", async () => {
    searchParamsStore.value = new URLSearchParams("partnershipId=not-in-list");
    mockList([
      makePartnership("other-row", {
        status: "INVITED",
        initiatedBy: "other",
        note: "Другая запись",
      }),
    ]);
    renderHub();
    await waitFor(() => {
      expect(remcardFetch.mock.calls.some((c) => String(c[0]).includes("/api/partnership/list"))).toBe(
        true,
      );
    });
    expect(screen.queryByTestId("partner-partnership-detail-dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/not-in-list/i)).not.toBeInTheDocument();
  });

  it("incoming INVITED beyond page one still opens (no regression)", async () => {
    const wanted = "wanted-29";
    searchParamsStore.value = new URLSearchParams(`partnershipId=${wanted}`);
    mockList(
      Array.from({ length: 30 }, (_, i) => {
        const id = i === 29 ? wanted : `incoming-${i}`;
        return makePartnership(id, {
          status: "INVITED",
          initiatedBy: "other",
          note: `Уникальные условия ${id}`,
        });
      }),
    );
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-partnership-detail-dialog").textContent).toMatch(
      /wanted-29/,
    );
  });

  it("review while certificate pending shows loading testid, not confirmed empty", async () => {
    const user = userEvent.setup();
    let resolveCert: (value: unknown) => void = () => undefined;
    fetchCert.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCert = resolve;
        }),
    );
    render(
      <PartnerInviteWizard
        target={{
          id: "t1",
          displayName: "Магазин",
          city: "Краснодар",
          photoUrl: null,
          description: null,
          specializations: [],
          badges: [],
          storeCategories: ["doors"],
          partnerType: "STORE",
          branches: [],
          rating: null,
          ratingCount: 0,
          partnershipStatus: null,
        }}
        meProfile={storeProfile()}
        onClose={() => undefined}
        onSent={() => undefined}
        disableSubmit
      />,
    );
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Ждём");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    expect(screen.getByTestId("invite-terms-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("invite-request-terms")).not.toBeInTheDocument();
    resolveCert({ status: "empty" });
    await waitFor(() => expect(screen.getByTestId("invite-request-terms")).toBeInTheDocument());
  });
});
