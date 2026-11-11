/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryHub } from "./HistoryHub";
import { ACCEPTED_STORE_ACCESS_DENIED_NOTE } from "@/lib/history-labels";
import type { AuthUser } from "@/lib/types";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/history-loader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/history-loader")>();
  return {
    ...actual,
    fetchHistoryData: vi.fn(),
    fetchAcceptedPurchasePage: vi.fn(),
  };
});

import { fetchHistoryData } from "@/lib/history-loader";

const storeUser: AuthUser = {
  id: "store-1",
  role: "PRO",
  partnerType: "STORE",
  displayName: "Store",
};

const companyUser: AuthUser = {
  id: "company-1",
  role: "PRO",
  partnerType: "COMPANY",
  displayName: "Company",
};

const agentUser: AuthUser = {
  id: "agent-1",
  role: "PRO",
  partnerType: null,
  displayName: "Agent",
  partnerActivities: ["AGENT"],
};

const specialistUser: AuthUser = {
  id: "spec-1",
  role: "PRO",
  partnerType: "MASTER",
  displayName: "Specialist",
};

describe("HistoryHub meaningful empty states by role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("store: tabs plus empty purchases and optional accepted-access note", async () => {
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [],
      accruals: [],
      sources: { acceptedOrders: false, issuedOrders: false },
      acceptedPagination: null,
      acceptedAccessDenied: true,
    });

    render(<HistoryHub user={storeUser} />);

    expect(await screen.findByRole("tab", { name: /Покупки/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Начисления/i })).toBeInTheDocument();
    expect(screen.getByText(ACCEPTED_STORE_ACCESS_DENIED_NOTE)).toBeInTheDocument();
    expect(screen.getByText("Покупок не найдено")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("company: same empty hub as store seller without load error", async () => {
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [],
      accruals: [],
      sources: { acceptedOrders: true, issuedOrders: false },
      acceptedPagination: { hasMore: false, nextCursor: null },
      acceptedAccessDenied: false,
    });

    render(<HistoryHub user={companyUser} />);

    expect(await screen.findByRole("tab", { name: /Покупки/i })).toBeInTheDocument();
    expect(screen.getByText("Покупок не найдено")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("agent: issuer empty purchases without bare error alert", async () => {
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [],
      accruals: [],
      sources: { acceptedOrders: false, issuedOrders: true },
      acceptedPagination: null,
      acceptedAccessDenied: false,
    });

    render(<HistoryHub user={agentUser} />);

    expect(await screen.findByRole("tab", { name: /Покупки/i })).toBeInTheDocument();
    expect(screen.getByText("Покупок не найдено")).toBeInTheDocument();
    expect(screen.queryByText(ACCEPTED_STORE_ACCESS_DENIED_NOTE)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("specialist: empty accruals tab without load failure", async () => {
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [],
      accruals: [],
      sources: { acceptedOrders: false, issuedOrders: true },
      acceptedPagination: null,
      acceptedAccessDenied: false,
    });

    render(<HistoryHub user={specialistUser} />);

    expect(await screen.findByRole("tab", { name: /Начисления/i })).toBeInTheDocument();
    expect(await screen.findByText("Покупок не найдено")).toBeInTheDocument();

    screen.getByRole("tab", { name: /Начисления/i }).click();
    expect(await screen.findByText("Начислений не найдено")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("surfaces load error when both accrual sources fail (not normal empty)", async () => {
    vi.mocked(fetchHistoryData).mockRejectedValue(new RemcardApiError(500, "Server error"));

    render(<HistoryHub user={agentUser} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Server error/i);
    expect(screen.queryByText("Покупок не найдено")).toBeNull();
  });
});
