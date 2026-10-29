/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerInviteWizard } from "./PartnerInviteWizard";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {
    status = 400;
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

vi.mock("@/lib/partner-certificate-program", () => ({
  fetchPartnerCertificateProgram: vi.fn().mockResolvedValue({ status: "empty" }),
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

function meProfile(): ProProfileResponse {
  return {
    user: {
      id: "me",
      publicId: "ME",
      displayName: "Алексей",
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

function storeTarget(overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult {
  return {
    id: "store-1",
    displayName: "Дом материалов",
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
    ...overrides,
  };
}

describe("PartnerInviteWizard", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("walks three steps without submitting until final button", async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={meProfile()}
        onClose={() => undefined}
        onSent={onSent}
        disableSubmit
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("invite-request-terms")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    expect(screen.getByTestId("invite-wizard-step-message")).toBeInTheDocument();
    expect(remcardFetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("invite-template-short"));
    const message = screen.getByTestId("invite-wizard-message") as HTMLTextAreaElement;
    expect(message.value.length).toBeGreaterThan(10);

    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    expect(screen.getByTestId("invite-wizard-step-review")).toBeInTheDocument();
    expect(remcardFetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("invite-wizard-submit"));
    expect(remcardFetch).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Отправка отключена/i);
  });

  it("sends requestPartnerTerms for non-agent without published percents", async () => {
    const user = userEvent.setup();
    remcardFetch.mockResolvedValue({
      partnershipId: "p1",
      success: true,
    });
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={meProfile()}
        onClose={() => undefined}
        onSent={() => undefined}
      />,
    );
    await waitFor(() => screen.getByTestId("invite-request-terms"));
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByTestId("invite-template-short"));
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await user.click(screen.getByTestId("invite-wizard-submit"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    const [, opts] = remcardFetch.mock.calls[0];
    expect(opts.body.cooperationRequest).toBeUndefined();
    expect(opts.body.requestPartnerTerms).toBe(true);
    expect(opts.body.terms).toEqual([]);
    expect(screen.getByTestId("invite-wizard-share")).toBeInTheDocument();
  });

  it("keeps selected published categories in agent payload (not empty terms)", async () => {
    const user = userEvent.setup();
    remcardFetch.mockResolvedValue({ partnershipId: "p2", success: true });
    const agentProfile = meProfile();
    agentProfile.user.partnerType = "COMPANY";
    agentProfile.user.partnerActivities = ["AGENT"];
    render(
      <PartnerInviteWizard
        target={storeTarget({
          publishedTerms: [
            {
              category: "doors",
              categoryLabel: "Двери",
              poolPercent: 12,
              storePercent: 12,
            },
          ],
        })}
        meProfile={agentProfile}
        onClose={() => undefined}
        onSent={() => undefined}
      />,
    );
    await waitFor(() => screen.getByText(/Двери/));
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByTestId("invite-template-short"));
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await user.click(screen.getByTestId("invite-wizard-submit"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    const [, opts] = remcardFetch.mock.calls[0];
    expect(opts.body.cooperationRequest).toBeUndefined();
    expect(opts.body.terms?.[0]?.category).toBe("doors");
    expect(opts.body.terms?.[0]?.storePercent).toBe(12);
  });

  it("confirms template replace after custom edit; Escape closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={meProfile()}
        onClose={onClose}
        onSent={() => undefined}
        disableSubmit
      />,
    );

    await waitFor(() => screen.getByTestId("invite-request-terms"));
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByTestId("invite-template-business"));
    const field = screen.getByTestId("invite-wizard-message") as HTMLTextAreaElement;
    await user.clear(field);
    await user.type(field, "мой собственный текст");
    await user.click(screen.getByTestId("invite-template-friendly"));
    expect(screen.getByTestId("invite-template-confirm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Оставить свой/i }));
    expect(field.value).toContain("мой собственный текст");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows agent one-way copy for pure agent inviter", async () => {
    const agentProfile = meProfile();
    agentProfile.user.partnerType = "COMPANY";
    agentProfile.user.partnerActivities = ["AGENT"];
    render(
      <PartnerInviteWizard
        target={storeTarget()}
        meProfile={agentProfile}
        onClose={() => undefined}
        onSent={() => undefined}
        disableSubmit
      />,
    );
    await waitFor(() => screen.getByTestId("invite-wizard-step-partner"));
    const step = screen.getByTestId("invite-wizard-step-partner");
    expect(within(step).getByText(/рекомендовать товары или услуги получателя/i)).toBeInTheDocument();
  });
});
