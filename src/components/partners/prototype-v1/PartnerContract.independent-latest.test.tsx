/** @vitest-environment jsdom */
/** Independent contract regressions. LOCAL FIXTURE only; no production writes. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerInviteWizard } from "./PartnerInviteWizard";
import { PartnerLinkInviteWizard } from "./PartnerLinkInviteWizard";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import { DISCUSSION_SUBJECT_MAX } from "@/lib/partners-prototype-v1/discussion-subject";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {
    status = 400;
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

const fetchCert = vi.fn();
vi.mock("@/lib/partner-certificate-program", () => ({
  fetchPartnerCertificateProgram: (...args: unknown[]) => fetchCert(...args),
}));

function specialistProfile(): ProProfileResponse {
  return {
    user: {
      id: "specialist-1",
      publicId: "SPEC",
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

function storeTarget(): PartnerSearchResult {
  return {
    id: "fixture-target",
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

describe("PartnerContract independent-latest", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    fetchCert.mockReset();
    fetchCert.mockResolvedValue({ status: "empty" });
  });

  it("retains all custom conditions shown at review in the server payload", async () => {
    const user = userEvent.setup();
    remcardFetch.mockResolvedValue({ partnershipId: "p-local", success: true });
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={specialistProfile()}
        onClose={() => undefined}
        onSent={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Личное сообщение");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await user.click(screen.getByTestId("invite-terms-mode-custom"));
    await user.type(screen.getByTestId("invite-partner-action"), "Рекомендовать двери");
    await user.type(screen.getByTestId("invite-partner-benefit"), "Бонус за заказы");
    await user.type(screen.getByTestId("invite-own-terms"), "Взаимный обмен");
    const preview = screen.getByTestId("invite-review-conditions").textContent || "";
    expect(preview).toContain("Рекомендовать двери");
    expect(preview).toContain("Бонус за заказы");
    expect(preview).toContain("Взаимный обмен");
    await user.click(screen.getByTestId("invite-wizard-submit"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    const post = remcardFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    expect(post).toBeTruthy();
    const body = post![1].body as {
      note: string;
      terms: unknown[];
      requestPartnerTerms?: boolean;
      cooperationRequest?: boolean;
    };
    expect(body.cooperationRequest).not.toBe(true);
    expect(body.requestPartnerTerms).toBe(true);
    expect(body.terms).toEqual([]);
    expect(body.note).toContain("Личное сообщение");
    expect(body.note).toContain("Рекомендовать двери");
    expect(body.note).toContain("Бонус за заказы");
    expect(body.note).toContain("Взаимный обмен");
  });

  it("does not turn certificate loading failure into absence of published terms", async () => {
    const user = userEvent.setup();
    fetchCert.mockResolvedValue({
      status: "error",
      message: "fixture upstream unavailable",
    });
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={specialistProfile()}
        onClose={() => undefined}
        onSent={() => undefined}
        disableSubmit
      />,
    );
    await waitFor(() => expect(screen.getByTestId("invite-terms-error")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.type(screen.getByTestId("invite-wizard-message"), "Текст");
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    expect(screen.getByTestId("invite-terms-error")).toBeInTheDocument();
    expect(screen.queryByTestId("invite-request-terms")).not.toBeInTheDocument();
    expect(screen.getByTestId("invite-terms-error").textContent).not.toMatch(
      /нет опубликованных условий/i,
    );
  });

  it("clamps link discussion subject to DISCUSSION_SUBJECT_MAX including paste", async () => {
    const user = userEvent.setup();
    render(
      <PartnerLinkInviteWizard meProfile={specialistProfile()} disableSubmit />,
    );
    await user.type(screen.getByTestId("link-invite-name"), "Дом материалов");
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    const field = screen.getByTestId("link-invite-message") as HTMLTextAreaElement;
    const oversized = "я".repeat(DISCUSSION_SUBJECT_MAX + 1);
    // Simulate paste of oversized clipboard content through the controlled clamp.
    await user.click(field);
    await user.clear(field);
    // fire input via typing is slow; set via paste API when available, else change event.
    field.focus();
    await user.paste(oversized);
    if (field.value.length === 0) {
      // jsdom paste may be empty — exercise clamp path directly.
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(field, { target: { value: oversized } });
    }
    expect(field.value.length).toBeLessThanOrEqual(DISCUSSION_SUBJECT_MAX);
    expect(field.value.length).toBe(DISCUSSION_SUBJECT_MAX);
    expect(screen.getByTestId("link-invite-message-count").textContent).toMatch(
      new RegExp(`${DISCUSSION_SUBJECT_MAX}`),
    );
  });
});
