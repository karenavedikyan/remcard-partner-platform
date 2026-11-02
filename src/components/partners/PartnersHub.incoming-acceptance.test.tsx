import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
const api = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api-client", () => ({ remcardFetch: api, RemcardApiError: class extends Error {} }));
vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: async () => ({ products: [], services: [], stages: [] }),
}));
const profile = { user: { id: "owned-recipient", displayName: "Получатель", partnerType: "COMPANY",
  partnerActivities: ["AGENT"], specializations: [], storeCategories: [] }, organization: null,
} as unknown as ProProfileResponse;
function invitation(status: Partnership["status"] = "INVITED"): Partnership {
  return { id: "owned-offer", status, initiatedBy: "owned-sender", pendingProposedBy: status === "PENDING" ? "owned-sender" : null,
    createdAt: "2026-11-02T10:00:00Z", updatedAt: "2026-11-02T10:01:00Z",
    storeUserId: "owned-sender", proUserId: "owned-recipient", note: "Рекомендуйте двери.\nЛичные условия.",
    storeUser: { id: "owned-sender", displayName: "Поставщик", city: "Краснодар", partnerType: "STORE", storeCategories: ["doors"], specializations: [] },
    proUser: { id: "owned-recipient", displayName: "Получатель", city: "Сочи", partnerType: "COMPANY", partnerActivities: ["AGENT"], storeCategories: [], specializations: [] },
    terms: [
      { id: "t1", category: "doors", categoryLabel: "Двери", storePercent: 12.5, isExcluded: false, minMargin: null },
      { id: "t2", category: "handles", categoryLabel: "Фурнитура и замки", storePercent: 0, isExcluded: true, minMargin: null },
    ] };
}
let row: Partnership;
beforeEach(() => {
  row = invitation();
  api.mockReset().mockImplementation(async (path: string, options?: { method?: string }) => {
    if (options?.method === "PATCH") { row = { ...row, status: "ACTIVE" }; return { ok: true }; }
    if (path === "/api/partnership/list") return { partnerships: [row] };
    if (path === "/api/partnership/link-invite") return { invites: [] };
    if (path === "/api/pro/profile") return profile;
    throw new Error(`Unexpected ${path}`);
  });
});
function mount(audience: PartnersHubAudience = "agent-r04") {
  return render(<PartnersHub meId="owned-recipient" initialProfile={profile} variant="agent-r04"
    agentPresentation="overview" partnersAudience={audience} />);
}
async function open() {
  await userEvent.click((await screen.findAllByRole("button", { name: /^Принять( условия)?$/ }))[0]!);
  return screen.getByTestId("partner-invitation-acceptance");
}
const patches = () => api.mock.calls.filter(([, options]) => options?.method === "PATCH");
describe("incoming acceptance with an immutable review", () => {
  it.each(["agent-r04", "specialist-r04", "business-store-r04", "business-company-r04"] as const)(
    "%s: review without editing, confirm, active group and later explicit changes", async audience => {
      mount(audience); const dialog = await open();
      expect(patches()).toHaveLength(0);
      expect(dialog).toHaveTextContent("Поставщик");
      expect(dialog).toHaveTextContent("12.5%");
      expect(dialog).toHaveTextContent("Исключено из предложения");
      expect(dialog).toHaveTextContent("Личные условия.");
      expect(within(dialog).queryByRole("textbox")).toBeNull();
      expect(within(dialog).queryByRole("button", { name: /изменить|другие условия/i })).toBeNull();
      await userEvent.click(within(dialog).getByRole("button", { name: "Принять условия" }));
      expect(await screen.findByTestId("partner-invitation-accepted")).toHaveTextContent("Сотрудничество активно");
      expect(patches()).toHaveLength(1);
      expect(patches()[0]![1].body).toEqual({ action: "accept" });
      expect(screen.queryByTestId("term-change-panel")).toBeNull();
      await userEvent.click(within(dialog).getByRole("button", { name: "К партнёрам" }));
      expect(screen.queryByTestId("partner-invitation-acceptance")).toBeNull();
      expect(within(screen.getByTestId("partners-zone-active")).getAllByRole("button", { name: "Изменить условия" }).length).toBeGreaterThan(0);
    });
  it("PENDING first offer is accept-only and sends the exact reviewed version", async () => {
    row = invitation("PENDING"); mount(); const dialog = await open();
    expect(screen.queryByRole("button", { name: "Запросить другие условия" })).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Принять условия" }));
    await screen.findByTestId("partner-invitation-accepted");
    expect(patches()[0]![1].body).toEqual({ action: "accept_pending", expectedUpdatedAt: "2026-11-02T10:01:00Z" });
  });
  it("Back and Escape do not accept and return keyboard focus", async () => {
    mount(); const dialog = await open();
    const back = within(dialog).getByRole("button", { name: "Назад" });
    back.focus(); fireEvent.keyDown(window, { key: "Tab" });
    expect(within(dialog).getByRole("button", { name: "Принять условия" })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("partner-invitation-acceptance")).toBeNull());
    expect(patches()).toHaveLength(0);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Принять"));
  });
  it("retains offered snapshot through failed PATCH, explicit retry and duplicate click", async () => {
    const base = api.getMockImplementation()!;
    let finish!: () => void;
    let fail = true;
    api.mockImplementation(async (path, options) => {
      if (options?.method === "PATCH") {
        if (fail) { fail = false; throw new Error("offline"); }
        await new Promise<void>(resolve => { finish = resolve; });
        row = { ...row, status: "ACTIVE" }; return { ok: true };
      }
      return base(path, options);
    });
    mount(); const dialog = await open();
    await userEvent.click(within(dialog).getByRole("button", { name: "Принять условия" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Действие не выполнено");
    expect(screen.queryByTestId("partner-invitation-accepted")).toBeNull();
    const button = within(dialog).getByRole("button", { name: "Принять условия" });
    fireEvent.click(button); fireEvent.click(button);
    expect(patches()).toHaveLength(2);
    expect(within(dialog).getByRole("button", { name: "Назад" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" }); expect(dialog).toBeInTheDocument();
    finish(); await screen.findByTestId("partner-invitation-accepted");
    expect(dialog).toHaveTextContent("12.5%");
  });
  it("keeps confirmed acceptance when the subsequent list refresh fails", async () => {
    const base = api.getMockImplementation()!;
    api.mockImplementation((path, options) => {
      if (path === "/api/partnership/list" && row.status === "ACTIVE") return Promise.reject(new Error("list offline"));
      return base(path, options);
    });
    mount(); const dialog = await open();
    await userEvent.click(within(dialog).getByRole("button", { name: "Принять условия" }));
    await screen.findByTestId("partner-invitation-accepted");
    expect(patches()).toHaveLength(1);
    expect(within(dialog).queryByRole("button", { name: "Принять условия" })).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "К партнёрам" }));
    expect(screen.queryByRole("button", { name: /^Принять/ })).toBeNull();
  });
  it("rejects an unconfirmed 200 and retains the explicit accept control", async () => {
    const base = api.getMockImplementation()!;
    api.mockImplementation((path, options) => options?.method === "PATCH" ? Promise.resolve({ ok: false }) : base(path, options));
    mount(); const dialog = await open();
    await userEvent.click(within(dialog).getByRole("button", { name: "Принять условия" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Действие не выполнено");
    expect(screen.queryByTestId("partner-invitation-accepted")).toBeNull();
  });
  it("accepts from a detail card without competing focus traps or an invisible leftover dialog", async () => {
    mount();
    await userEvent.click((await screen.findAllByTestId("partner-row-name-button"))[0]!);
    const details = await screen.findByTestId("partner-partnership-detail-dialog");
    expect(details).toHaveTextContent("Личные условия.");
    await userEvent.click(within(details).getByRole("button", { name: "Принять" }));
    const dialog = screen.getByTestId("partner-invitation-acceptance");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("partner-invitation-acceptance")).toBeNull());
    expect(details).toBeInTheDocument();
    await userEvent.click(within(details).getByRole("button", { name: "Принять" }));
    await userEvent.click(within(screen.getByTestId("partner-invitation-acceptance")).getByRole("button", { name: "Принять условия" }));
    await screen.findByTestId("partner-invitation-accepted");
    await userEvent.click(within(screen.getByTestId("partner-invitation-acceptance")).getByRole("button", { name: "К партнёрам" }));
    expect(screen.queryByTestId("partner-partnership-detail-dialog")).toBeNull();
  });
  it("does not resurrect acceptance after changing recipient scope", async () => {
    const base = api.getMockImplementation()!;
    let finish!: () => void;
    api.mockImplementation(async (path, options) => {
      if (options?.method === "PATCH") { await new Promise<void>(resolve => { finish = resolve; }); return { ok: true }; }
      return base(path, options);
    });
    const view = mount(); const dialog = await open();
    fireEvent.click(within(dialog).getByRole("button", { name: "Принять условия" }));
    view.rerender(<PartnersHub meId="another-owned-user" initialProfile={profile} variant="agent-r04" agentPresentation="overview" />);
    finish();
    await waitFor(() => expect(screen.queryByTestId("partner-invitation-acceptance")).toBeNull());
  });
  it("does not let the author accept their own invitation", async () => {
    row.initiatedBy = "owned-recipient"; mount();
    await screen.findByTestId("partners-overview-tiles");
    expect(screen.queryByRole("button", { name: /^Принять/ })).toBeNull();
    expect(patches()).toHaveLength(0);
  });
  it("does not treat an empty agent request as financial conditions to accept", async () => {
    row.terms = [];
    row.storeUser = { ...row.storeUser, partnerType: "COMPANY", partnerActivities: ["AGENT"] };
    row.proUser = { ...row.proUser, partnerType: "STORE", partnerActivities: ["STORE"] };
    mount("business-store-r04");
    await screen.findByTestId("partners-overview-tiles");
    expect(screen.queryByRole("button", { name: /^Принять/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Предложение агенту" }).length).toBeGreaterThan(0);
    expect(patches()).toHaveLength(0);
  });
});
