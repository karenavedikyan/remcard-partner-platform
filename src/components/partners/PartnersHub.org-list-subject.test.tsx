import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { Partnership } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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

import { remcardFetch } from "@/lib/api-client";

const QA_OWNER = "qa-owner";
const EMPLOYEE = "employee-client";

function partnershipRow(input: {
  id: string;
  storeUserId: string;
  proUserId: string;
  storeName: string;
  proName: string;
}): Partnership {
  return {
    id: input.id,
    status: "ACTIVE",
    storeUserId: input.storeUserId,
    proUserId: input.proUserId,
    initiatedBy: QA_OWNER,
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    terms: [{ id: "t1", category: "general", storePercent: 10, isExcluded: false }],
    storeUser: {
      id: input.storeUserId,
      displayName: input.storeName,
      organizationName: input.storeName,
      partnerType: input.storeUserId === QA_OWNER ? "COMPANY" : "AGENT",
      city: "Москва",
    },
    proUser: {
      id: input.proUserId,
      displayName: input.proName,
      organizationName: input.proName,
      partnerType: input.proUserId === QA_OWNER ? "COMPANY" : "AGENT",
      city: "Москва",
    },
  } as unknown as Partnership;
}

describe("PartnersHub org workplace list subject", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path.includes("/api/partnership/list")) {
        return {
          partnerships: [
            partnershipRow({
              id: "ps-alpha",
              storeUserId: QA_OWNER,
              proUserId: "agent-beta",
              storeName: "Тестовая организация",
              proName: "QA-Партнёр-Бета",
            }),
            partnershipRow({
              id: "ps-beta",
              storeUserId: "agent-alpha",
              proUserId: QA_OWNER,
              storeName: "QA-Партнёр-Альфа",
              proName: "Тестовая организация",
            }),
          ],
          listCounts: { active: 2, archive: 0, hidden: 0 },
        };
      }
      if (path.includes("/api/pro/profile")) {
        return { user: { id: EMPLOYEE, displayName: "Сотрудник" } };
      }
      throw new Error(`unexpected fetch ${path}`);
    });
  });

  it("passes org owner as listSubjectUserId into overview active collection", async () => {
    render(
      <PartnersHub
        meId={EMPLOYEE}
        partnershipSubjectUserId={QA_OWNER}
        initialProfile={{
          user: { id: EMPLOYEE, displayName: "Сотрудник", partnerType: null },
        }}
        variant="agent-r04"
        agentPresentation="overview"
      />,
    );

    const activeCollection = await screen.findByTestId("agent-active-collection");
    expect(activeCollection).toHaveAttribute("data-list-principal-id", QA_OWNER);
  });
});
