import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { ObserverPartnersWorkspace } from "./ObserverPartnersWorkspace";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const at = "2026-11-14T16:00:00.000Z";

const payload = {
  appeals: [
    { id: "a1", clientDisplayName: "Клиент Первого", certificateId: "c1", receivingPartnerUserId: "recv-1", receivingBranchId: null, referrerProUserId: "me", stageKey: "sys_new", createdAt: at, updatedAt: at, interest: "Двери" },
    { id: "a2", clientDisplayName: "Клиент Второго", certificateId: "c2", receivingPartnerUserId: "recv-2", receivingBranchId: null, referrerProUserId: "me", stageKey: "sys_new", createdAt: at, updatedAt: at, interest: "Полы" },
  ],
  receivingPartners: [
    { receivingPartnerUserId: "recv-1", displayName: "Партнёр Один", city: "Казань", category: "Двери", receivingBranchId: null },
    { receivingPartnerUserId: "recv-2", displayName: "Партнёр Два", city: "Казань", category: "Полы", receivingBranchId: null },
  ],
  personalMeta: {},
  total: 2, hasMore: false, page: 1, limit: 100,
};

beforeEach(() => {
  api.mockReset();
  api.mockResolvedValue(payload);
});

describe("Observer workspace direction deep link", () => {
  it("opens the exact receiving partner and shows only its clients", async () => {
    render(<ObserverPartnersWorkspace initialPartnerId="recv-2" />);
    expect(await screen.findByText("Клиент Второго")).toBeVisible();
    expect(screen.queryByText("Клиент Первого")).toBeNull();
  });

  it("lists every receiving partner when no deep link is given", async () => {
    render(<ObserverPartnersWorkspace />);
    expect((await screen.findAllByText("Партнёр Один")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Партнёр Два").length).toBeGreaterThan(0);
  });
});
