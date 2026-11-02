import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
const api = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api-client", () => ({ remcardFetch: api, RemcardApiError: class extends Error {} }));
vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: async () => ({ products: [], services: [], stages: [] }),
}));
const profile = { user: { id: "owned-agent", displayName: "Агент", partnerType: "COMPANY",
  partnerActivities: ["AGENT"], specializations: [], storeCategories: [] }, organization: null,
} as unknown as ProProfileResponse;
const rows = Array.from({ length: 25 }, (_, i) => ({
  id: `owned-row-${i}`, displayName: `Студия ${i}`, partnerType: "STORE",
  city: "Краснодар", storeCategories: ["doors"], specializations: [], partnershipStatus: null,
})) as unknown as PartnerSearchResult[];
beforeEach(() => {
  api.mockReset().mockImplementation(async (path: string, options?: { method?: string }) => {
    if (options?.method === "POST") return { ok: true, partnershipId: "owned-invitation" };
    if (path.startsWith("/api/partnership/search")) {
      const append = new URL(path, "http://owned").searchParams.has("cursor");
      return { partners: append ? rows.slice(20) : rows.slice(0,20), nextCursor: append ? null : "20" };
    }
    if (path.includes("certificate-program-summary")) return { items: [
      { category: "doors", categoryLabel: "Двери", poolPercent: 12 },
    ] };
    return { ...profile, partnerships: [] };
  });
});
function mount() {
  const onCloseAgentModal = vi.fn();
  render(<PartnersHub meId="owned-agent" initialProfile={profile} variant="agent-r04"
    agentModalSurface="find" forcedTab="find" onCloseAgentModal={onCloseAgentModal} />);
  return onCloseAgentModal;
}
describe("directory cooperation keeps the search context", () => {
  it("confirms the actual target, retains all 25 rows, and blocks another invite after Back", async () => {
    const closeHub = mount();
    await screen.findAllByTestId("agent-partner-search-result-card");
    await userEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
    await waitFor(() => expect(screen.getAllByTestId("agent-partner-search-result-card")).toHaveLength(25));
    await userEvent.click(screen.getAllByTestId("agent-partner-search-result-detail")[24]!);
    await userEvent.click(screen.getByTestId("partner-find-directory-detail-invite"));
    expect(screen.getByTestId("partner-direct-invite-target")).toHaveTextContent("Студия 24");
    await userEvent.type(screen.getByRole("textbox", { name: /Предмет сотрудничества/ }), "Обсудим товары");
    await userEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    expect(await screen.findByTestId("partner-direct-invite-ready")).toHaveTextContent("Студия 24");
    expect(closeHub).not.toHaveBeenCalled();
    expect(api.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(1);
    expect(api.mock.calls.find(([, o]) => o?.method === "POST")?.[1].body.targetUserId).toBe("owned-row-24");
    await userEvent.click(screen.getByRole("button", { name: "Назад к поиску" }));
    const cards = screen.getAllByTestId("agent-partner-search-result-card");
    expect(cards).toHaveLength(25);
    expect(cards[24]).toHaveTextContent("Приглашение");
    await waitFor(() => expect(cards[24]).toHaveFocus());
    expect(within(cards[24]!).queryByRole("button", { name: "Сотрудничать" })).not.toBeInTheDocument();
    expect(within(cards[0]!).getByRole("button", { name: "Сотрудничать" })).toBeEnabled();
  });
  it("cancels a proposal with no POST and traps keyboard focus inside it", async () => {
    mount(); await screen.findAllByTestId("agent-partner-search-result-card");
    await userEvent.click(screen.getAllByRole("button", { name: "Сотрудничать", exact: true })[0]!);
    const dialog = screen.getByTestId("partner-direct-invite-dialog");
    const cancel = within(dialog).getByRole("button", { name: "Отмена" });
    cancel.focus(); fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("partner-direct-invite-dialog")).not.toBeInTheDocument();
    expect(api.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(0);
    expect(screen.getAllByTestId("agent-partner-search-result-card")).toHaveLength(20);
  });
});
