/** @vitest-environment jsdom */
/**
 * Round2 depth regressions (LOCAL FIXTURE). Independent of reviewer-original-round2.
 * Does not weaken older assertions; covers published ownTerms, deep-link row,
 * stale cert retry, pending≠empty, Unicode clamp.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentPartnersHub } from "@/components/partners/AgentPartnersHub";
import { PartnerInviteWizard } from "./PartnerInviteWizard";
import { PartnerLinkInviteWizard } from "./PartnerLinkInviteWizard";
import type { PartnerSearchResult, Partnership, ProProfileResponse } from "@/lib/types";
import { DISCUSSION_SUBJECT_MAX } from "@/lib/partners-prototype-v1/discussion-subject";
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
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [],
    services: [],
    stages: [],
  }),
}));

function baseUser(partial: Partial<ProProfileResponse["user"]> = {}): ProProfileResponse["user"] {
  return {
    id: "actor-1",
    publicId: "ACT",
    displayName: "Актёр",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "MASTER",
    partnerActivities: ["SERVICE"],
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
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
    ...partial,
  };
}

function profileFor(audience: "specialist" | "store" | "company"): ProProfileResponse {
  if (audience === "specialist") {
    return {
      user: baseUser({
        id: "specialist-1",
        partnerType: "MASTER",
        partnerActivities: ["SERVICE"],
        specializations: ["painting"],
      }),
      organization: null,
      programs: [],
    };
  }
  if (audience === "store") {
    return {
      user: baseUser({
        id: "store-actor",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
        storeCategories: ["doors"],
      }),
      organization: {
        id: "org-store",
        name: "Магазин-актор",
        catalogStatus: "APPROVED",
        partnerType: "STORE",
        branchCount: 1,
      },
      programs: [],
    };
  }
  return {
    user: baseUser({
      id: "company-actor",
      partnerType: "COMPANY",
      partnerActivities: ["STORE", "SERVICE"],
    }),
    organization: {
      id: "org-co",
      name: "Компания-актор",
      catalogStatus: "APPROVED",
      partnerType: "COMPANY",
      branchCount: 1,
    },
    programs: [],
  };
}

function publishedStore(id = "fixture-target"): PartnerSearchResult {
  return {
    id,
    displayName: "Магазин Двери",
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
    publishedTerms: [
      {
        category: "doors",
        categoryLabel: "Двери",
        poolPercent: 12,
        storePercent: 12,
      },
    ],
  };
}

function hubProfile(audience: PartnersHubAudience): ProProfileResponse {
  if (audience === "business-store-r04") return profileFor("store");
  if (audience === "business-company-r04") return profileFor("company");
  if (audience === "agent-r04") {
    return {
      user: baseUser({
        id: "me-1",
        partnerType: "COMPANY",
        partnerActivities: ["AGENT"],
      }),
      organization: null,
      programs: [],
    };
  }
  return profileFor("specialist");
}

function makeIncoming(id: string, note: string): Partnership {
  return {
    id,
    status: "INVITED",
    initiatedBy: "other",
    pendingProposedBy: null,
    note,
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

describe("PartnerRound2Depth reviewer", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    fetchCert.mockReset();
    fetchCert.mockResolvedValue({ status: "empty" });
    remcardFetch.mockResolvedValue({ partnerships: [], partners: [], nextCursor: null });
    searchParamsStore.value = new URLSearchParams();
  });

  for (const audience of ["specialist", "store", "company"] as const) {
    it(`${audience}: published numeric terms do not discard the visible reciprocal ownTerms`, async () => {
      const user = userEvent.setup();
      remcardFetch.mockResolvedValue({ partnershipId: "p-pub", success: true });
      render(
        <PartnerInviteWizard
          target={publishedStore()}
          meProfile={profileFor(audience)}
          onClose={() => undefined}
          onSent={() => undefined}
        />,
      );
      await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
      await user.type(screen.getByTestId("invite-wizard-message"), "Моё сообщение");
      await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
      await waitFor(() => expect(screen.getByTestId("invite-published-terms")).toBeInTheDocument());
      await user.type(
        screen.getByTestId("invite-own-terms"),
        "Ответная скидка семь процентов",
      );
      expect(screen.getByTestId("invite-review-conditions").textContent).toContain(
        "Ответная скидка семь процентов",
      );
      await user.click(screen.getByTestId("invite-wizard-submit"));
      await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
      const post = remcardFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
      expect(post).toBeTruthy();
      const body = post![1].body as { note: string; terms: Array<{ category: string; storePercent: number }> };
      expect(body.terms).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ category: "doors", storePercent: 12 }),
        ]),
      );
      expect(body.note).toContain("Моё сообщение");
      expect(body.note).toContain("Ответная скидка семь процентов");
      expect(body.note).not.toMatch(/общий процент 12%/);
    });
  }

  for (const param of ["partnershipId", "terms"] as const) {
    it(`${param}: opens the actual recipient row beyond page one, not just incoming tab`, async () => {
      const wanted = "wanted-29";
      searchParamsStore.value = new URLSearchParams(`${param}=${wanted}`);
      const partnerships = Array.from({ length: 30 }, (_, i) => {
        const id = i === 29 ? wanted : `incoming-${i}`;
        return makeIncoming(id, `Уникальные условия ${id}`);
      });
      remcardFetch.mockImplementation(async (path: string) => {
        const p = String(path);
        if (p.includes("/api/partnership/list") || (p.includes("/api/partnerships") && !p.includes("term-change"))) {
          return { partnerships };
        }
        if (p.includes("/term-change")) {
          return { requests: [] };
        }
        return { partners: [], nextCursor: null };
      });

      render(
        <AgentPartnersHub
          meId="me-1"
          initialProfile={hubProfile("business-store-r04")}
          presentationAudience="business-store-r04"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Приглашения/i })).toHaveAttribute(
          "aria-selected",
          "true",
        );
      });
      await waitFor(() => {
        expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
      });
      expect(screen.getByTestId("partner-partnership-detail-dialog").textContent).toMatch(
        /Уникальные условия wanted-29|Партнёр wanted-29/,
      );
      expect(
        remcardFetch.mock.calls.some((c) => String(c[0]).includes(`/api/partnerships/${wanted}/term-change`)),
      ).toBe(true);
    });
  }

  it("review while certificate request is pending does not claim confirmed empty terms", async () => {
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
          ...publishedStore(),
          publishedTerms: undefined,
        }}
        meProfile={profileFor("specialist")}
        onClose={() => undefined}
        onSent={() => undefined}
        disableSubmit
      />,
    );
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Пока грузится");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    expect(screen.getByTestId("invite-terms-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("invite-request-terms")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/нет опубликованных условий/i);
    await act(async () => {
      resolveCert({ status: "empty" });
    });
    await waitFor(() => expect(screen.getByTestId("invite-request-terms")).toBeInTheDocument());
  });

  it("late retry for A cannot overwrite B's selected recipient and published categories", async () => {
    const user = userEvent.setup();
    let resolveA: (value: unknown) => void = () => undefined;
    fetchCert.mockImplementation((id: string) => {
      if (id === "target-a") {
        return new Promise((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve({
        status: "loaded",
        items: [
          {
            category: "windows",
            categoryLabel: "Окна",
            poolPercent: 23,
          },
        ],
      });
    });

    const onClose = vi.fn();
    const view = render(
      <PartnerInviteWizard
        target={{ ...publishedStore("target-a"), publishedTerms: undefined }}
        meProfile={profileFor("specialist")}
        onClose={onClose}
        onSent={() => undefined}
        disableSubmit
      />,
    );
    await waitFor(() => expect(fetchCert).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Черновик A");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    // Force error so retry is available if empty path didn't error; simulate error via resolve
    await act(async () => {
      resolveA({ status: "error", message: "fixture A fail" });
    });
    await waitFor(() => expect(screen.getByTestId("invite-terms-retry")).toBeInTheDocument());

    let resolveRetryA: (value: unknown) => void = () => undefined;
    fetchCert.mockImplementation((id: string) => {
      if (id === "target-a") {
        return new Promise((resolve) => {
          resolveRetryA = resolve;
        });
      }
      return Promise.resolve({
        status: "loaded",
        items: [
          {
            category: "windows",
            categoryLabel: "Окна",
            poolPercent: 23,
          },
        ],
      });
    });
    await user.click(screen.getByTestId("invite-terms-retry"));

    view.rerender(
      <PartnerInviteWizard
        target={{
          id: "target-b",
          displayName: "Магазин Окна",
          city: "Краснодар",
          photoUrl: null,
          description: null,
          specializations: [],
          badges: [],
          storeCategories: ["windows"],
          partnerType: "STORE",
          branches: [],
          rating: null,
          ratingCount: 0,
          partnershipStatus: null,
          publishedTerms: [
            {
              category: "windows",
              categoryLabel: "Окна",
              poolPercent: 23,
              storePercent: 23,
            },
          ],
        }}
        meProfile={profileFor("specialist")}
        onClose={onClose}
        onSent={() => undefined}
        disableSubmit
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Магазин Окна|Окна/)).toBeTruthy();
    });
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    const msg = screen.getByTestId("invite-wizard-message") as HTMLTextAreaElement;
    await user.clear(msg);
    await user.type(msg, "Черновик B");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await waitFor(() => expect(screen.getByTestId("invite-published-terms")).toBeInTheDocument());
    expect(screen.getByTestId("invite-published-terms").textContent).toContain("Окна");
    expect(screen.getByTestId("invite-published-terms").textContent).toContain("23%");

    await act(async () => {
      resolveRetryA({
        status: "loaded",
        items: [
          {
            category: "doors",
            categoryLabel: "Двери",
            poolPercent: 12,
          },
        ],
      });
    });

    // Stale A must not hard-reset B back to partner step / doors 12%.
    expect(screen.queryByTestId("invite-wizard-step-partner")).not.toBeInTheDocument();
    expect(screen.getByTestId("invite-wizard-step-review")).toBeInTheDocument();
    expect(screen.getByTestId("invite-published-terms").textContent).toContain("Окна");
    expect(screen.getByTestId("invite-published-terms").textContent).toContain("23%");
    expect(screen.getByTestId("invite-published-terms").textContent).not.toContain("12%");
  });

  it("late retry A cannot drive B submission using A's numeric published percentage", async () => {
    const user = userEvent.setup();
    let resolveRetryA: (value: unknown) => void = () => undefined;
    fetchCert.mockResolvedValue({ status: "error", message: "fail A" });

    const onSent = vi.fn();
    const view = render(
      <PartnerInviteWizard
        target={{ ...publishedStore("target-a"), publishedTerms: undefined }}
        meProfile={profileFor("specialist")}
        onClose={() => undefined}
        onSent={onSent}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("invite-terms-error")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "A");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await waitFor(() => expect(screen.getByTestId("invite-terms-retry")).toBeInTheDocument());

    fetchCert.mockImplementation((id: string) => {
      if (id === "target-a") {
        return new Promise((resolve) => {
          resolveRetryA = resolve;
        });
      }
      return Promise.resolve({ status: "empty" });
    });
    await user.click(screen.getByTestId("invite-terms-retry"));

    remcardFetch.mockResolvedValue({ partnershipId: "p-b", success: true });
    view.rerender(
      <PartnerInviteWizard
        target={{
          id: "target-b",
          displayName: "B",
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
          publishedTerms: [
            {
              category: "doors",
              categoryLabel: "Двери",
              poolPercent: 23,
              storePercent: 23,
            },
          ],
        }}
        meProfile={profileFor("specialist")}
        onClose={() => undefined}
        onSent={onSent}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Сообщение B");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await waitFor(() => expect(screen.getByTestId("invite-published-terms")).toBeInTheDocument());

    await act(async () => {
      resolveRetryA({
        status: "loaded",
        items: [
          {
            category: "doors",
            categoryLabel: "Двери",
            poolPercent: 12,
          },
        ],
      });
    });

    await user.click(screen.getByTestId("invite-wizard-submit"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    const post = remcardFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    const body = post![1].body as {
      targetUserId: string;
      terms: Array<{ storePercent: number }>;
    };
    expect(body.targetUserId).toBe("target-b");
    expect(body.terms[0]?.storePercent).toBe(23);
  });

  it("paste at the 500-unit boundary does not leave an unpaired emoji surrogate", async () => {
    const user = userEvent.setup();
    remcardFetch.mockResolvedValue({
      token: "tok",
      previewPath: "/invite/discussion/tok",
    });
    render(<PartnerLinkInviteWizard meProfile={profileFor("specialist")} />);
    await user.type(screen.getByTestId("link-invite-name"), "Дом");
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    const field = screen.getByTestId("link-invite-message") as HTMLTextAreaElement;
    const boundary = "я".repeat(DISCUSSION_SUBJECT_MAX - 1) + "😀";
    await user.click(field);
    fireEvent.change(field, { target: { value: boundary } });
    expect(field.value.length).toBeLessThanOrEqual(DISCUSSION_SUBJECT_MAX);
    const last = field.value.charCodeAt(field.value.length - 1);
    expect(last < 0xd800 || last > 0xdbff).toBe(true);
    expect(field.value).not.toMatch(/\uD83D$/);

    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await user.click(screen.getByTestId("link-invite-submit"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    const post = remcardFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    const body = post![1].body as { cooperationSubject: string };
    expect(body.cooperationSubject.length).toBeLessThanOrEqual(DISCUSSION_SUBJECT_MAX);
    const bodyLast = body.cooperationSubject.charCodeAt(body.cooperationSubject.length - 1);
    expect(bodyLast < 0xd800 || bodyLast > 0xdbff).toBe(true);
  });
});
