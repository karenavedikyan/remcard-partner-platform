/** Independent reviewer regression tests. Local only; no production requests. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerInviteWizard } from "./PartnerInviteWizard";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {},
  remcardFetch: (...args: unknown[]) => api.fetch(...args),
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

function profile(): ProProfileResponse {
  return {
    user: {
      id: "reviewer-specialist",
      publicId: "REVIEWER",
      displayName: "Специалист",
      city: "Краснодар",
      specializations: ["painting"],
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
    },
    organization: null,
    programs: [],
  };
}

function recipient(): PartnerSearchResult {
  return {
    id: "reviewer-store",
    displayName: "Магазин",
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
  };
}

describe("Independent reviewer: invitation safety and continuity", () => {
  beforeEach(() => {
    api.fetch.mockReset();
    // certificate-program-summary GET (no production) — empty published terms
    api.fetch.mockResolvedValue({ items: [], truncated: false, totalPublished: 0 });
  });

  it("preserves message and current step after same-user profile refresh", async () => {
    const user = userEvent.setup();
    const target = recipient();
    const onClose = vi.fn();
    const onSent = vi.fn();
    const view = render(
      <PartnerInviteWizard
        target={target}
        meProfile={profile()}
        onClose={onClose}
        onSent={onSent}
        disableSubmit
      />,
    );
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Сохранить мой текст");
    view.rerender(
      <PartnerInviteWizard
        target={target}
        meProfile={profile()}
        onClose={onClose}
        onSent={onSent}
        disableSubmit
      />,
    );
    expect(screen.getByTestId("invite-wizard-step-message")).toBeInTheDocument();
    expect(screen.getByTestId("invite-wizard-message")).toHaveValue("Сохранить мой текст");
  });

  it("does not submit a specialist request as an agent-only cooperationRequest", async () => {
    const user = userEvent.setup();
    api.fetch.mockImplementation(async (_path: string, options?: { method?: string }) => {
      if (options?.method === "POST") {
        return { partnershipId: "local-only-invite", success: true };
      }
      return { items: [], truncated: false, totalPublished: 0 };
    });
    render(
      <PartnerInviteWizard
        target={recipient()}
        meProfile={profile()}
        onClose={vi.fn()}
        onSent={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Предлагаю сотрудничество");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await user.click(screen.getByTestId("invite-wizard-submit"));
    await waitFor(() => {
      const writes = api.fetch.mock.calls.filter(([, options]) => options?.method === "POST");
      expect(writes.length).toBe(1);
      // Release guard preserved: non-agent must not send cooperationRequest:true.
      expect(writes[0][1].body.cooperationRequest).not.toBe(true);
      // Task-branch extended contract for business empty terms.
      expect(writes[0][1].body.requestPartnerTerms).toBe(true);
      expect(writes[0][1].body.terms).toEqual([]);
    });
  });
});
