import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
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
  },
};

function makePartnership(): Partnership {
  return {
    id: "qa-p1",
    status: "ACTIVE",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
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
}

function installMocks() {
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
      return { partnerships: [makePartnership()] };
    }
    if (typeof path === "string" && path.includes("/term-change")) {
      return { requests: [] };
    }
    if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
      return { invites: [] };
    }
    if (path === "/api/pro/profile") {
      return agentProfile;
    }
    throw new RemcardApiError(500, `fail-closed ${String(path)}`);
  });
}

describe("PartnersHub C1 centered term modal", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    resetBodyScrollLockForTests();
  });

  it("opens centered modal with R1 title/table; Escape closes without mutation", async () => {
    installMocks();
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
      expect(screen.getByTestId("partner-term-change-modal")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Предложить изменение условий" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("term-change-table")).toBeInTheDocument();
    expect(screen.getByTestId("term-change-submit")).toHaveTextContent(
      "Отправить на согласование",
    );
    expect(screen.getAllByTestId("partner-term-change-panel")).toHaveLength(1);

    const mutationsBefore = vi
      .mocked(remcardFetch)
      .mock.calls.filter(([, init]) => init?.method && init.method !== "GET").length;

    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByTestId("partner-term-change-modal")).not.toBeInTheDocument();
    });
    expect(
      vi
        .mocked(remcardFetch)
        .mock.calls.filter(([, init]) => init?.method && init.method !== "GET").length,
    ).toBe(mutationsBefore);
  });

  it("dirty Escape opens discard; Keep restores draft; Discard restores trigger focus, 0 POST", async () => {
    installMocks();
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
    const trigger = openButtons[0]!;
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByTestId("term-draft-doors")).toBeInTheDocument());

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-discard-confirm")).toBeInTheDocument();
    });
    expect(screen.getByTestId("partner-term-change-modal")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("partner-term-discard-confirm-confirm"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-term-discard-confirm")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("term-draft-doors")).toHaveValue(15);

    await userEvent.click(screen.getByTestId("term-change-close"));
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-discard-confirm")).toBeInTheDocument();
    });
    const postsBefore = vi
      .mocked(remcardFetch)
      .mock.calls.filter(([, init]) => init?.method === "POST").length;
    await userEvent.click(screen.getByTestId("partner-term-discard-confirm-dismiss"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-term-change-modal")).not.toBeInTheDocument();
    });
    expect(
      vi.mocked(remcardFetch).mock.calls.filter(([, init]) => init?.method === "POST").length,
    ).toBe(postsBefore);
    await waitFor(() => {
      const focused = document.activeElement as HTMLElement | null;
      expect(focused?.getAttribute("data-testid")).toBe("partner-term-change-qa-p1");
    });
  });

  it("busy submit blocks Escape close (no discard, modal stays)", async () => {
    let resolvePost: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships: [makePartnership()] };
      }
      if (
        typeof path === "string" &&
        path.includes("/term-change") &&
        (init?.method ?? "GET") === "GET"
      ) {
        return { requests: [] };
      }
      if (
        typeof path === "string" &&
        path.includes("/term-change") &&
        init?.method === "POST"
      ) {
        return new Promise((resolve) => {
          resolvePost = resolve;
        });
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      if (path === "/api/pro/profile") {
        return agentProfile;
      }
      throw new RemcardApiError(500, `fail-closed ${String(path)}`);
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
    await waitFor(() => expect(screen.getByTestId("term-draft-doors")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("term-draft-doors"), "18");
    await userEvent.click(screen.getByTestId("term-change-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("partner-term-change-modal")).toHaveAttribute(
        "data-busy",
        "true",
      );
    });

    await userEvent.keyboard("{Escape}");
    expect(screen.getByTestId("partner-term-change-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-term-discard-confirm")).not.toBeInTheDocument();

    resolvePost({});
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-change-modal")).toHaveAttribute(
        "data-busy",
        "false",
      );
    });
  });
});
