import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { remcardFetch } from "@/lib/api-client";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [],
    stages: [],
  }),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const storeProfile: ProProfileResponse = {
  organization: {
    id: "org-1",
    name: "Shop",
    catalogStatus: "APPROVED",
    partnerType: "STORE",
    branchCount: 1,
    storeCategories: ["doors"],
    specializations: [],
  },
  programs: [],
  user: {
    id: "me-1",
    publicId: "RC1",
    displayName: "Владелец",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "STORE",
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors"],
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
    showFullName: false,
  },
};

const searchPartner = (id: string): PartnerSearchResult => ({
  id,
  displayName: `Partner ${id}`,
  city: "Краснодар",
  photoUrl: null,
  description: null,
  specializations: [],
  badges: [],
  storeCategories: [],
  branches: [],
  rating: null,
  ratingCount: 0,
  partnershipStatus: null,
});

function mockListAndSearch(
  searchImpl: (...args: unknown[]) => Promise<unknown>,
) {
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/partnership/list") {
      return { partnerships: [] };
    }
    if (typeof path === "string" && path.startsWith("/api/partnership/search")) {
      return searchImpl(path, init);
    }
    if (path === "/api/partnership/link-invite" && init?.method !== "POST") {
      return { invites: [] };
    }
    if (path === "/api/pro/profile") {
      return storeProfile;
    }
    throw new Error(`unexpected fetch ${String(path)}`);
  });
}

describe("PartnersHub search empty state", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows useful empty state after successful search with no results", async () => {
    mockListAndSearch(async () => ({ partners: [], nextCursor: null }));
    render(<PartnersHub meId="me-1" initialProfile={storeProfile} />);
    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /По выбранным условиям партнёры пока не найдены/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Пригласите их в RemCard и предложите сотрудничество/i),
    ).toBeInTheDocument();
  });

  it("shows loading then error with retry without empty copy", async () => {
    mockListAndSearch(async () => {
      throw new (await import("@/lib/api-client")).RemcardApiError(500, "Сервер недоступен");
    });
    render(<PartnersHub meId="me-1" initialProfile={storeProfile} />);
    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    await waitFor(() => {
      expect(screen.getByText(/Сервер недоступен/i)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/По выбранным условиям партнёры пока не найдены/i),
    ).not.toBeInTheDocument();
    const errorPanel = screen
      .getByRole("heading", { name: /Не удалось выполнить поиск/i })
      .closest("section");
    expect(errorPanel).not.toBeNull();
    expect(within(errorPanel!).getByRole("button", { name: /Повторить/i })).toBeInTheDocument();
  });

  it("opens link invite tab without POST and preserves filters on return", async () => {
    mockListAndSearch(async () => ({ partners: [], nextCursor: null }));
    render(<PartnersHub meId="me-1" initialProfile={storeProfile} />);
    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Пригласить знакомого партнёра/i })).toBeEnabled();
    });

    const cityInput = screen.getByLabelText(/Город/i);
    await userEvent.type(cityInput, "Анапа");

    await userEvent.click(screen.getByRole("button", { name: /Пригласить знакомого партнёра/i }));
    expect(screen.getByRole("tab", { name: /Пригласить по ссылке/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: /Пригласить по ссылке/i })).toBeInTheDocument();

    const postCalls = vi
      .mocked(remcardFetch)
      .mock.calls.filter(([, init]) => init?.method === "POST");
    expect(postCalls).toHaveLength(0);

    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    expect(screen.getByLabelText(/Город/i)).toHaveValue("Анапа");
  });

  it("resets filters and taxonomy text via secondary action", async () => {
    mockListAndSearch(async () => ({ partners: [], nextCursor: null }));
    render(<PartnersHub meId="me-1" initialProfile={storeProfile} />);
    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Пригласить знакомого партнёра/i })).toBeEnabled();
    });

    await userEvent.type(screen.getByLabelText(/Поиск по имени/i), "Магазин");
    await userEvent.type(screen.getByPlaceholderText(/двери, сантехника/i), "двер");
    expect(screen.getByRole("button", { name: /Сбросить фильтры/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Сбросить фильтры/i }));
    expect(screen.getByLabelText(/Поиск по имени/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/двери, сантехника/i)).toHaveValue("");
  });

  it("ignores stale search response when filters change quickly", async () => {
    let resolveSlow: (value: unknown) => void = () => {};
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });
    mockListAndSearch(async (path) => {
      if (path.includes("city=SlowCity")) {
        await slowPromise;
        return { partners: [searchPartner("stale")], nextCursor: null };
      }
      return { partners: [], nextCursor: null };
    });

    render(<PartnersHub meId="me-1" initialProfile={storeProfile} />);
    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /По выбранным условиям партнёры пока не найдены/i }),
      ).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/Город/i), "SlowCity");
    await waitFor(() => {
      expect(screen.getByText(/Ищем партнёров/i)).toBeInTheDocument();
    });

    await userEvent.clear(screen.getByLabelText(/Город/i));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /По выбранным условиям партнёры пока не найдены/i }),
      ).toBeInTheDocument();
    });

    resolveSlow({ partners: [searchPartner("stale")], nextCursor: null });
    await waitFor(() => {
      expect(screen.queryByText(/Partner stale/i)).not.toBeInTheDocument();
    });
  });

  it("keeps loaded cards when append returns an empty page", async () => {
    let call = 0;
    mockListAndSearch(async (path) => {
      if (!path.includes("cursor=")) {
        return {
          partners: [searchPartner("keep")],
          nextCursor: "cur-1",
        };
      }
      call += 1;
      return { partners: [], nextCursor: null };
    });

    render(<PartnersHub meId="me-1" initialProfile={storeProfile} />);
    await userEvent.click(screen.getByRole("tab", { name: /Найти в RemCard/i }));
    await waitFor(() => {
      expect(screen.getByText(/Partner keep/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /Показать ещё/i }));
    await waitFor(() => {
      expect(screen.getByText(/Partner keep/i)).toBeInTheDocument();
    });
    expect(call).toBe(1);
    expect(screen.queryByRole("button", { name: /Показать ещё/i })).not.toBeInTheDocument();
  });
});
