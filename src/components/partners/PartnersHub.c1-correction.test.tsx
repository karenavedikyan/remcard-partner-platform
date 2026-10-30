import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [],
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

const { remcardFetch, RemcardApiError } = await import("@/lib/api-client");

const agentProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "agent-me",
    publicId: "QA-AGENT",
    displayName: "Synthetic Agent",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
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
    showFullName: false,
  },
};

const qaPartnership: Partnership = {
  id: "qa-p1",
  status: "ACTIVE",
  initiatedBy: "store-1",
  pendingProposedBy: null,
  note: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  storeUserId: "store-1",
  proUserId: "agent-me",
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 10,
      isExcluded: false,
      minMargin: null,
    },
  ],
  storeUser: {
    id: "store-1",
    displayName: "Synthetic Store",
    city: "Краснодар",
    specializations: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
  },
  proUser: {
    id: "agent-me",
    displayName: "Synthetic Agent",
    city: "Краснодар",
    specializations: [],
    storeCategories: [],
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
  },
};

function termChangeGets() {
  return vi
    .mocked(remcardFetch)
    .mock.calls.filter(
      ([path]) =>
        typeof path === "string" &&
        path.includes("/api/partnerships/qa-p1/term-change") &&
        !String(path).includes("/respond"),
    );
}

function installFailClosedMocks(options: {
  termChange?: "ok" | "fail";
} = {}) {
  const termChange = options.termChange ?? "ok";
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    const method = init?.method ?? "GET";
    if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
      return { partnerships: [qaPartnership] };
    }
    if (typeof path === "string" && path.includes("/api/partnerships/qa-p1/term-change")) {
      if (method !== "GET" && method !== undefined) {
        throw new RemcardApiError(500, "synthetic mutation blocked");
      }
      if (termChange === "fail") {
        throw new RemcardApiError(500, "term-change load failed");
      }
      return { requests: [] };
    }
    if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
      return { invites: [] };
    }
    if (path === "/api/pro/profile") {
      return agentProfile;
    }
    throw new RemcardApiError(500, `fail-closed: ${String(path)}`);
  });
}

describe("PartnersHub C1 correction regressions", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("single editing host: open terms yields exactly one partner-term-change-panel", async () => {
    installFailClosedMocks({ termChange: "ok" });
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const openButtons = await screen.findAllByTestId("partner-term-change-qa-p1");
    await userEvent.click(openButtons[0]!);

    await waitFor(() => {
      expect(screen.getAllByTestId("partner-term-change-panel")).toHaveLength(1);
    });
    expect(screen.getByTestId("partner-term-change-host")).toBeInTheDocument();
  });

  it("retry refreshes GET and keeps panel open (reload ≠ open/toggle)", async () => {
    let termMode: "fail" | "ok" = "fail";
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      const method = init?.method ?? "GET";
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships: [qaPartnership] };
      }
      if (typeof path === "string" && path.includes("/api/partnerships/qa-p1/term-change")) {
        if (method !== "GET" && method !== undefined) {
          throw new RemcardApiError(500, "synthetic mutation blocked");
        }
        if (termMode === "fail") {
          throw new RemcardApiError(500, "term-change load failed");
        }
        return { requests: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      if (path === "/api/pro/profile") {
        return agentProfile;
      }
      throw new RemcardApiError(500, `fail-closed: ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const openButtons = await screen.findAllByTestId("partner-term-change-qa-p1");
    await userEvent.click(openButtons[0]!);

    await waitFor(() => {
      expect(screen.getByTestId("term-change-retry")).toBeInTheDocument();
    });
    const getsBefore = termChangeGets().length;
    expect(getsBefore).toBeGreaterThanOrEqual(1);

    termMode = "ok";
    await userEvent.click(screen.getByTestId("term-change-retry"));

    await waitFor(() => {
      expect(termChangeGets().length).toBeGreaterThan(getsBefore);
    });
    expect(screen.getByTestId("partner-term-change-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("term-change-retry")).not.toBeInTheDocument();
  });

  it("pause confirm owns focus; detail trap suspends (dismiss focused, not detail-close)", async () => {
    installFailClosedMocks({ termChange: "ok" });
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const nameButtons = await screen.findAllByTestId("partner-row-name-button");
    await userEvent.click(nameButtons[0]!);

    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("partner-detail-action-pause"));

    await waitFor(() => {
      expect(screen.getByTestId("partner-pause-confirm")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-pause-confirm-dismiss")).toHaveFocus();
    expect(screen.getByTestId("partner-detail-close")).not.toHaveFocus();

    // Escape activates safe dismiss only — no PATCH
    const patchBefore = vi
      .mocked(remcardFetch)
      .mock.calls.filter(([, init]) => init?.method === "PATCH").length;
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByTestId("partner-pause-confirm")).not.toBeInTheDocument();
    });
    expect(
      vi.mocked(remcardFetch).mock.calls.filter(([, init]) => init?.method === "PATCH").length,
    ).toBe(patchBefore);
    expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
  });

  it("dirty term discard confirm keeps draft on Keep and does not steal to detail", async () => {
    installFailClosedMocks({ termChange: "ok" });
    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const openButtons = await screen.findAllByTestId("partner-term-change-qa-p1");
    await userEvent.click(openButtons[0]!);
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-change-panel")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/Предлагаете/i), "15");
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
        "data-dirty",
        "true",
      );
    });

    await userEvent.click(screen.getByTestId("term-change-close"));
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-discard-confirm")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-term-discard-confirm-confirm")).toHaveFocus();

    await userEvent.click(screen.getByTestId("partner-term-discard-confirm-confirm"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-term-discard-confirm")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
      "data-dirty",
      "true",
    );
    expect(screen.getByLabelText(/Предлагаете/i)).toHaveValue(15);
  });
});
