/** @vitest-environment jsdom */
/** Independent flow regressions. LOCAL FIXTURE only; no production writes. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentPartnersHub } from "@/components/partners/AgentPartnersHub";
import { DiscussionInviteLanding } from "@/components/invite/DiscussionInviteLanding";
import { PartnerVitrineDetails } from "@/components/partners/prototype-v1/PartnerVitrineDetails";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const remcardFetch = vi.fn();
const getAuthMe = vi.fn();
const routerPush = vi.fn();
const searchParamsStore = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {
    status = 400;
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
  getAuthMe: (...args: unknown[]) => getAuthMe(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsStore.value,
  useRouter: () => ({
    push: routerPush,
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

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

function profileFor(audience: PartnersHubAudience): ProProfileResponse {
  const baseUser = {
    id: "me-1",
    publicId: "ME",
    displayName: "Я",
    city: "Краснодар",
    specializations: [] as string[],
    role: "PRO" as const,
    description: null,
    catalogStatus: "APPROVED" as const,
    isPublic: true,
    rejectionReason: null,
    badges: [] as string[],
    photoUrl: null,
    storeCategories: [] as string[],
    areas: [] as string[],
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
  };
  if (audience === "agent-r04") {
    return {
      user: {
        ...baseUser,
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      },
      organization: null,
      programs: [],
    };
  }
  if (audience === "specialist-r04") {
    return {
      user: {
        ...baseUser,
        partnerType: "MASTER",
        partnerActivities: ["SERVICE"],
        specializations: ["painting"],
      },
      organization: null,
      programs: [],
    };
  }
  if (audience === "business-store-r04") {
    return {
      user: {
        ...baseUser,
        partnerType: "STORE",
        partnerActivities: ["STORE"],
        storeCategories: ["doors"],
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
  return {
    user: {
      ...baseUser,
      partnerType: "COMPANY",
      partnerActivities: ["STORE", "SERVICE"],
    },
    organization: {
      id: "org-co",
      name: "Компания",
      catalogStatus: "APPROVED",
      partnerType: "COMPANY",
      branchCount: 1,
    },
    programs: [],
  };
}

describe("PartnerFlow independent-latest", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    getAuthMe.mockReset();
    routerPush.mockReset();
    remcardFetch.mockResolvedValue({ partnerships: [], partners: [], nextCursor: null });
    getAuthMe.mockResolvedValue({ user: { id: "viewer-1" } });
    searchParamsStore.value = new URLSearchParams();
  });

  const audiences: PartnersHubAudience[] = [
    "agent-r04",
    "specialist-r04",
    "business-store-r04",
    "business-company-r04",
  ];

  for (const audience of audiences) {
    it(`opens three-step link wizard from modal entry for ${audience}`, async () => {
      searchParamsStore.value = new URLSearchParams("hub=link");
      render(
        <AgentPartnersHub
          meId="me-1"
          initialProfile={profileFor(audience)}
          presentationAudience={audience}
        />,
      );
      await waitFor(() => {
        expect(screen.getByTestId("partner-link-invite-wizard")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("partner-link-invite-panel")).not.toBeInTheDocument();
      expect(remcardFetch.mock.calls.every(([, opts]) => opts?.method !== "POST")).toBe(true);
    });
  }

  it("opens incoming invitations for registered partnershipId deep link", async () => {
    searchParamsStore.value = new URLSearchParams("partnershipId=incoming-invite-1");
    remcardFetch.mockImplementation(async (path: string) => {
      if (String(path).includes("/api/partnership/list") || String(path).includes("/api/partnerships")) {
        return {
          partnerships: [
            {
              id: "incoming-invite-1",
              status: "INVITED",
              initiatedBy: "other",
              pendingProposedBy: null,
              note: "Здравствуйте",
              createdAt: "",
              updatedAt: "",
              storeUserId: "me-1",
              proUserId: "other",
              terms: [],
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
                displayName: "Специалист",
                city: null,
                specializations: ["painting"],
                storeCategories: [],
                partnerType: "MASTER",
                partnerActivities: ["SERVICE"],
              },
            },
          ],
        };
      }
      if (String(path).includes("/term-change")) {
        return { requests: [] };
      }
      return { partners: [], nextCursor: null };
    });

    render(
      <AgentPartnersHub
        meId="me-1"
        initialProfile={profileFor("business-store-r04")}
        presentationAudience="business-store-r04"
      />,
    );

    await waitFor(() => {
      const invitesTab = screen.getByRole("tab", { name: /Приглашения/i });
      expect(invitesTab).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.getByRole("tab", { name: /Мои партнёры/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("opens actual PartnerVitrineDetails and binds invite to the same target id", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    const onClose = vi.fn();
    const partner: PartnerSearchResult = {
      id: "vitrine-target-77",
      displayName: "Витринный магазин",
      city: "Краснодар",
      photoUrl: null,
      description: "LOCAL FIXTURE описание витрины",
      specializations: [],
      badges: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
      publishedTerms: [
        {
          category: "doors",
          categoryLabel: "Двери",
          poolPercent: 12,
          storePercent: 12,
        },
      ],
    };
    render(
      <PartnerVitrineDetails
        partner={partner}
        onClose={onClose}
        onInvite={onInvite}
      />,
    );
    expect(screen.getByTestId("partner-vitrine-details")).toBeInTheDocument();
    expect(screen.getByTestId("partner-vitrine-details").textContent).toContain(
      "LOCAL FIXTURE описание витрины",
    );
    expect(screen.getByTestId("partner-vitrine-details").textContent).toMatch(/Двери/);
    expect(screen.getByTestId("partner-vitrine-details").textContent).toMatch(/12%/);
    await user.click(screen.getByRole("button", { name: /Пригласить|Сотрудничать/i }));
    expect(onInvite).toHaveBeenCalledWith(
      expect.objectContaining({ id: "vitrine-target-77" }),
    );
  });

  it("DiscussionInviteLanding reads public token, joins explicitly, then opens discussion context", async () => {
    const user = userEvent.setup();
    remcardFetch.mockImplementation(async (path: string, opts?: { method?: string }) => {
      const p = String(path);
      if (p.includes("/api/partnership/discussion-invite/public/")) {
        return {
          status: "PENDING",
          viewerRole: "recipient",
          inviteId: "disc-1",
          canJoin: true,
          inviter: { displayName: "Магазин", partnerType: "STORE", city: "Краснодар" },
          cooperationSubject: "LOCAL FIXTURE subject",
        };
      }
      if (p.includes("/api/partnership/discussion-invite/join") && opts?.method === "POST") {
        return { ok: true, inviteId: "disc-1", redirectPath: "/partners?discussion=disc-1" };
      }
      return {};
    });

    render(<DiscussionInviteLanding token="local-token" />);
    await waitFor(() => {
      expect(
        remcardFetch.mock.calls.some((c) =>
          String(c[0]).includes("/api/partnership/discussion-invite/public/local-token"),
        ),
      ).toBe(true);
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Присоединиться к обсуждению/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Присоединиться к обсуждению/i }));
    await waitFor(() => {
      const join = remcardFetch.mock.calls.find(
        ([path, opts]) =>
          String(path).includes("/api/partnership/discussion-invite/join") &&
          opts?.method === "POST",
      );
      expect(join).toBeTruthy();
      expect(join![1].body).toEqual({ token: "local-token" });
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Перейти к обсуждению/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Перейти к обсуждению/i }));
    expect(routerPush).toHaveBeenCalledWith("/partners?discussion=disc-1");
  });
});
