import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import { buildInviteHeroContent, formatInviteAudienceLabel, inviteRegistrationHref } from "@/lib/invite-presentation";
import type { ProProfileResponse } from "@/lib/types";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {},
  remcardFetch: fetchMock,
}));

function profile(type: string): ProProfileResponse {
  return {
    user: {
      id: "sender", displayName: "Проверка", partnerType: type,
      partnerActivities: type === "STORE" ? ["STORE"] : ["SERVICE"],
      storeCategories: ["doors"], specializations: [],
    },
    organization: null,
  } as unknown as ProProfileResponse;
}

describe("all four link-invite audiences", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_path, options) =>
      options?.method === "POST"
        ? { token: "qa-token", previewPath: "/invite/qa-token", expiresAt: "2026-11-16T00:00:00Z" }
        : { invites: [] },
    );
  });
  it.each(["MASTER", "STORE", "COMPANY"])("offers agent, specialist, store and company for %s sender", async (type) => {
    render(<PartnerLinkInvitePanel meProfile={profile(type)} />);
    expect([...screen.getByLabelText("Предполагаемый тип партнёра").querySelectorAll("option")].map((option) => option.textContent))
      .toEqual(["Выберите тип", "Агент", "Специалист", "Магазин", "Компания"]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
  it.each(["AGENT", "MASTER", "STORE", "COMPANY"])("submits the exact %s audience, never null/company coercion", async (type) => {
    render(<PartnerLinkInvitePanel meProfile={profile("COMPANY")} />);
    fireEvent.change(screen.getByLabelText("Предполагаемый тип партнёра"), { target: { value: type } });
    const percent = await screen.findAllByRole("spinbutton");
    fireEvent.change(percent[0], { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать ссылку" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/partnership/link-invite",
      expect.objectContaining({ method: "POST", body: expect.objectContaining({ intendedPartnerType: type }) }),
    ));
  });
  it("requires an explicit selection even for a store, without sending a generic invite", async () => {
    render(<PartnerLinkInvitePanel meProfile={profile("STORE")} />);
    fireEvent.click(screen.getByRole("button", { name: "Создать ссылку" }));
    expect(await screen.findByText("Укажите предполагаемый тип партнёра")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });
  it.each([
    ["AGENT", "agent"], ["MASTER", "specialist"], ["STORE", "store"], ["COMPANY", "company"],
  ])("registration retains %s choice and invitation return path", (type, role) => {
    const href = new URL(inviteRegistrationHref(type, "/invite/token"), "http://127.0.0.1");
    expect(href.pathname).toBe("/join");
    expect(href.searchParams.get("role")).toBe(role);
    expect(href.searchParams.get("returnTo")).toBe("/invite/token");
  });
  it("does not present an agent invite as a specialist invite from a store", () => {
    expect(formatInviteAudienceLabel("AGENT", "STORE")).toBe("Для агентов");
    const hero = buildInviteHeroContent({ status: "PENDING", intendedPartnerType: "AGENT", inviter: {
      displayName: "Проверка", partnerType: "STORE", city: null,
    } });
    expect(hero.lead).toContain("как агент");
    expect(hero.bullets).toContain("Регистрация не означает принятия предложения");
  });
});
