/** @vitest-environment jsdom */
/**
 * P2 active-list search/filters (LOCAL FIXTURE / synthetic).
 * Preserves P1 overview counters; does not mutate API on filter/sort/reset.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentPartnersHub } from "@/components/partners/AgentPartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";

const remcardFetch = vi.fn();
const fetchCert = vi.fn();
const fetchTaxonomy = vi.fn();
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

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: (...args: unknown[]) => fetchTaxonomy(...args),
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
    status: "ACTIVE" | "PAUSED" | "INVITED";
    initiatedBy: string;
    city?: string;
    partnerType?: string;
    partnerActivities?: string[];
    organizationName?: string;
    alias?: string | null;
    workingProductCategoryIds?: string[];
    workingNavigatorStageIds?: string[];
    archivedAt?: string | null;
    updatedAt?: string;
  },
): Partnership {
  return {
    id,
    status: opts.status,
    initiatedBy: opts.initiatedBy,
    pendingProposedBy: null,
    note: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: opts.updatedAt ?? "2026-01-02T00:00:00.000Z",
    storeUserId: "me-1",
    proUserId: `other-${id}`,
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
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
      id: `other-${id}`,
      displayName: opts.organizationName ?? `Партнёр ${id}`,
      organizationName: opts.organizationName ?? `Партнёр ${id}`,
      city: opts.city ?? null,
      specializations: [],
      storeCategories: opts.workingProductCategoryIds ?? [],
      partnerType: opts.partnerType ?? "STORE",
      partnerActivities: opts.partnerActivities ?? ["STORE"],
      workingProductCategoryIds: opts.workingProductCategoryIds,
      workingNavigatorStageIds: opts.workingNavigatorStageIds,
    },
    listPreference:
      opts.alias || opts.archivedAt
        ? {
            personalAlias: opts.alias ?? null,
            archivedAt: opts.archivedAt ?? null,
            hiddenAt: null,
          }
        : null,
  } as Partnership;
}

const syntheticDataset = () => [
  makePartnership("a-krd", {
    status: "ACTIVE",
    initiatedBy: "me-1",
    city: "Краснодар",
    partnerType: "STORE",
    partnerActivities: ["STORE"],
    organizationName: "Двери Юг",
    workingProductCategoryIds: ["doors"],
    workingNavigatorStageIds: ["L1-1"],
    updatedAt: "2026-01-10T00:00:00.000Z",
  }),
  makePartnership("a-msk", {
    status: "PAUSED",
    initiatedBy: "other",
    city: "Москва",
    partnerType: "COMPANY",
    partnerActivities: ["STORE", "AGENT"],
    organizationName: "Холдинг Центр",
    updatedAt: "2026-01-09T00:00:00.000Z",
  }),
  makePartnership("a-sochi", {
    status: "ACTIVE",
    initiatedBy: "me-1",
    city: "Сочи",
    partnerType: "AGENT",
    partnerActivities: ["AGENT"],
    organizationName: "Агент Про",
    alias: "Мой Ёжик",
    updatedAt: "2026-01-08T00:00:00.000Z",
  }),
  makePartnership("a-arch", {
    status: "ACTIVE",
    initiatedBy: "me-1",
    city: "Казань",
    partnerType: "SPECIALIST",
    partnerActivities: ["SERVICE"],
    organizationName: "Архив Мастер",
    archivedAt: "2026-01-01T00:00:00.000Z",
  }),
  makePartnership("in1", { status: "INVITED", initiatedBy: "other", city: "Тула" }),
  makePartnership("out1", { status: "INVITED", initiatedBy: "me-1", city: "Омск" }),
];

function mockApis(partnerships: Partnership[]) {
  remcardFetch.mockImplementation(async (path: string) => {
    const p = String(path);
    if (p.includes("/api/partnership/list")) return { partnerships };
    if (p.includes("/term-change")) return { requests: [] };
    return { partners: [], nextCursor: null };
  });
  fetchTaxonomy.mockResolvedValue({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "painting", label: "Покраска" }],
    stages: [{ kind: "stage", id: "L1-1", label: "Демонтаж" }],
  });
}

function renderHub() {
  return render(
    <AgentPartnersHub
      meId="me-1"
      initialProfile={storeProfile()}
      presentationAudience="business-store-r04"
    />,
  );
}

describe("PartnerActiveList P2", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    fetchCert.mockReset();
    fetchTaxonomy.mockReset();
    fetchCert.mockResolvedValue({ status: "empty" });
    searchParamsStore.value = new URLSearchParams();
  });

  it("uses prototype search copy and shows Filters N without counting search/sort", async () => {
    const user = userEvent.setup();
    mockApis(syntheticDataset());
    renderHub();
    await waitFor(() => expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument());
    const search = screen.getByTestId("agent-r04-list-search");
    expect(search).toHaveAttribute("placeholder", "Найти среди своих партнёров");
    expect(search).toHaveAccessibleName("Поиск среди своих партнёров");

    await user.click(screen.getByText(/^Фильтры/));
    await waitFor(() => expect(screen.getByTestId("active-partner-list-filters")).toBeInTheDocument());
    expect(screen.queryByTestId("partners-filters-count")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId("active-partner-type"), "store");
    expect(screen.getByTestId("partners-filters-count")).toHaveTextContent("1");

    await user.type(search, "двери");
    await user.selectOptions(screen.getByTestId("list-sort"), "name_asc");
    expect(screen.getByTestId("partners-filters-count")).toHaveTextContent("1");
  });

  it("AND filters keep P1 tile counts 2/1/1-style stable for active+pending fixture", async () => {
    const user = userEvent.setup();
    // 2 non-archived actives visible in tiles among dataset: a-krd ACTIVE + a-sochi ACTIVE + a-msk PAUSED = 3 active segment
    // overview counts active = non-archived ACTIVE/PAUSED = 3; decisions 1; outgoing 1
    mockApis(syntheticDataset());
    renderHub();
    await waitFor(() => expect(screen.getByTestId("partners-tile-active")).toBeInTheDocument());
    const before = {
      a: screen.getByTestId("partners-tile-active").getAttribute("aria-label"),
      d: screen.getByTestId("partners-tile-decide").getAttribute("aria-label"),
      w: screen.getByTestId("partners-tile-waiting").getAttribute("aria-label"),
    };
    expect(before.a).toMatch(/Действующие: 3/);
    expect(before.d).toMatch(/: 1/);
    expect(before.w).toMatch(/: 1/);

    await user.click(screen.getByText(/^Фильтры/));
    await user.selectOptions(screen.getByTestId("active-partner-city"), "Краснодар");
    await waitFor(() => {
      expect(screen.getByText(/Найдено: 1/)).toBeInTheDocument();
    });
    expect(screen.getByTestId("partners-tile-active").getAttribute("aria-label")).toEqual(before.a);
    expect(screen.getByTestId("partners-tile-decide").getAttribute("aria-label")).toEqual(before.d);
    expect(screen.getByTestId("partners-tile-waiting").getAttribute("aria-label")).toEqual(before.w);

    const listCalls = remcardFetch.mock.calls.filter((c) =>
      String(c[0]).includes("/api/partnership/list"),
    );
    expect(listCalls).toHaveLength(1);
  });

  it("Russian chips clear independently; city select stays complete; reset keeps sort", async () => {
    const user = userEvent.setup();
    mockApis(syntheticDataset());
    renderHub();
    await waitFor(() => expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument());
    await user.click(screen.getByText(/^Фильтры/));
    await waitFor(() => expect(screen.getByTestId("active-partner-city")).toBeInTheDocument());

    const citySelect = screen.getByTestId("active-partner-city");
    expect(within(citySelect).getByRole("option", { name: "Краснодар" })).toBeInTheDocument();
    expect(within(citySelect).getByRole("option", { name: "Москва" })).toBeInTheDocument();
    expect(within(citySelect).getByRole("option", { name: "Сочи" })).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId("active-partner-type"), "store");
    await user.selectOptions(citySelect, "Краснодар");
    await user.selectOptions(screen.getByTestId("active-partner-specialization"), "products:doors");
    await waitFor(() => expect(screen.getByTestId("list-filter-chips")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Снять фильтр Тип: Магазин/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Снять фильтр Специализация: Двери/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Снять фильтр Город: Краснодар/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId("list-sort"), "status");
    await user.click(screen.getByRole("button", { name: /Снять фильтр Город: Краснодар/i }));
    expect(screen.queryByRole("button", { name: /Город:/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Тип: Магазин/i })).toBeInTheDocument();
    // City options remain after other filters
    expect(within(screen.getByTestId("active-partner-city")).getByRole("option", { name: "Москва" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Сбросить фильтры/i }));
    expect(screen.getByTestId("active-partner-type")).toHaveValue("");
    expect(screen.getByTestId("active-partner-city")).toHaveValue("");
    expect(screen.getByTestId("list-sort")).toHaveValue("status");
    expect(screen.queryByTestId("partners-filters-count")).not.toBeInTheDocument();
  });

  it("search finds alias with ё/е; status PAUSED filters locally; company+agent activities is not agent", async () => {
    const user = userEvent.setup();
    mockApis(syntheticDataset());
    renderHub();
    await waitFor(() => expect(screen.getByTestId("agent-r04-list-search")).toBeInTheDocument());
    await user.type(screen.getByTestId("agent-r04-list-search"), "ежик");
    await waitFor(() => expect(screen.getByText(/Найдено: 1/)).toBeInTheDocument());

    await user.clear(screen.getByTestId("agent-r04-list-search"));
    await user.click(screen.getByText(/^Фильтры/));
    await user.selectOptions(screen.getByTestId("active-partner-status"), "PAUSED");
    await waitFor(() => expect(screen.getByText(/Найдено: 1/)).toBeInTheDocument());

    await user.selectOptions(screen.getByTestId("active-partner-status"), "");
    await user.selectOptions(screen.getByTestId("active-partner-type"), "agent");
    await waitFor(() => expect(screen.getByText(/Найдено: 1/)).toBeInTheDocument());
    expect(screen.queryByText(/Холдинг Центр/i)).not.toBeInTheDocument();
  });

  it("sort-only does not show reset or Filters N", async () => {
    const user = userEvent.setup();
    mockApis(syntheticDataset());
    renderHub();
    await waitFor(() => expect(screen.getByTestId("partners-filters-details")).toBeInTheDocument());
    await user.click(screen.getByText(/^Фильтры/));
    await user.selectOptions(screen.getByTestId("list-sort"), "name_asc");
    expect(screen.queryByTestId("partners-filters-count")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Сбросить фильтры/i })).not.toBeInTheDocument();
  });
});
